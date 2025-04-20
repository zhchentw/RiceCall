/* eslint-disable @typescript-eslint/no-require-imports */
const { v4: uuidv4 } = require('uuid');
// Utils
const utils = require('../utils');
const { Logger, Func } = utils;

// Database
const DB = require('../db');

const SHAKE_COOLDOWN_MS = 1000 * 60 * 30; // 30 minutes
const SHAKE_COOLDOWN_MAP = new Map();

// StandardizedError
const StandardizedError = require('../standardizedError');

const messageHandler = {
  sendMessage: async (io, socket, data) => {
    try {
      // data = {
      //   userId: string,
      //   serverId: string,
      //   channelId: string,
      //   message: {
      //     ...
      //   }
      // };

      // Validate data
      const { message: _newMessage, userId, serverId, channelId } = data;
      if (!_newMessage || !userId || !serverId || !channelId) {
        throw new StandardizedError(
          '無效的資料',
          'SENDMESSAGE',
          'ValidationError',
          'DATA_INVALID',
          401,
        );
      }
      const newMessage = await Func.validate.message(_newMessage);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);

      // Get data
      const channel = await DB.get.channel(channelId);
      const operatorMember = await DB.get.member(operatorId, serverId);

      // Validate operation
      if (operatorId !== userId) {
        throw new StandardizedError(
          '無法傳送非自己的訊息',
          'SENDMESSAGE',
          'PERMISSION_DENIED',
          403,
        );
      }
      if (channel.forbidGuestUrl && operatorMember.permissionLevel === 1) {
        newMessage.content = newMessage.content.replace(
          /https?:\/\/[^\s]+/g,
          '{{GUEST_SEND_AN_EXTERNAL_LINK}}',
        );
      }

      // Create new message
      const message = {
        ...newMessage,
        ...(await DB.get.member(userId, serverId)),
        ...(await DB.get.user(userId)),
        senderId: userId,
        serverId: serverId,
        channelId: channelId,
        timestamp: Date.now().valueOf(),
      };

      // Update member
      const updatedMember = {
        lastMessageTime: Date.now().valueOf(),
      };
      await DB.set.member(operatorId, serverId, updatedMember);

      // Play sound
      io.to(`channel_${channelId}`).emit('playSound', 'recieveChannelMessage');

      // Emit updated data (to the operator)
      io.to(socket.id).emit('memberUpdate', updatedMember);

      // Emit updated data (to all users in the channel)
      io.to(`channel_${channelId}`).emit('onMessage', message);

      new Logger('Message').success(
        `User(${operatorId}) sent ${newMessage.content} to channel(${channelId})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `傳送訊息時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SENDMESSAGE',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (to the operator)
      io.to(socket.id).emit('error', error);

      new Logger('Message').error(
        `Error sending message: ${error.error_message} (${socket.id})`,
      );
    }
  },

  sendDirectMessage: async (io, socket, data) => {
    try {
      // data = {
      //   userId: string,
      //   targetId: string,
      //   directMessage: {
      //     ...
      //   }
      // };

      // Validate data
      const { directMessage: _newDirectMessage, userId, targetId } = data;
      if (!_newDirectMessage || !userId || !targetId) {
        throw new StandardizedError(
          '無效的資料',
          'SENDDIRECTMESSAGE',
          'ValidationError',
          'DATA_INVALID',
          401,
        );
      }
      const newDirectMessage = await Func.validate.message(_newDirectMessage);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);

      // Get data
      let userSocket;
      io.sockets.sockets.forEach((_socket) => {
        if (_socket.userId === userId) {
          userSocket = _socket;
        }
      });
      let targetSocket;
      io.sockets.sockets.forEach((_socket) => {
        if (_socket.userId === targetId) {
          targetSocket = _socket;
        }
      });

      // Validate operation
      if (operatorId !== userId) {
        throw new StandardizedError(
          '無法傳送非自己的私訊',
          'SENDDIRECTMESSAGE',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Create new message
      const directMessage = {
        ...newDirectMessage,
        ...(await DB.get.user(userId)),
        senderId: userId,
        user1Id: userId.localeCompare(targetId) < 0 ? userId : targetId,
        user2Id: userId.localeCompare(targetId) < 0 ? targetId : userId,
        timestamp: Date.now().valueOf(),
      };

      // Emit updated data (to user and target *if online*)
      io.to(userSocket.id).emit('onDirectMessage', directMessage);
      if (targetSocket) {
        io.to(targetSocket.id).emit('onDirectMessage', directMessage);
      }

      new Logger('Message').success(
        `User(${userId}) sent ${newDirectMessage.content} to User(${targetId})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `傳送私訊時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SENDDIRECTMESSAGE',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (to the operator)
      io.to(socket.id).emit('error', error);

      new Logger('Message').error(
        `Error sending direct message: ${error.error_message} (${socket.id})`,
      );
    }
  },

  shakeDirectMessage: async (io, socket, data) => {
    try {
      // Validate data
      const { userId, targetId } = data;
      if (!userId || !targetId) {
        throw new StandardizedError(
          '無效的資料',
          'SHAKE_DIRECT_MESSAGE',
          'ValidationError',
          'DATA_INVALID',
          401,
        );
      }
      // Validate operation
      const operatorId = await Func.validate.socket(socket);

      // Get data
      const operator = await DB.get.user(operatorId);
      const user = await DB.get.user(userId);
      const target = await DB.get.user(targetId);

      if (!user || !target) {
        throw new StandardizedError(
          '無效的資料',
          'SHAKE_DIRECT_MESSAGE',
          'ValidationError',
          'DATA_INVALID',
          401,
        );
      }

      // Validate operation
      if (operator.userId !== user.userId) {
        throw new StandardizedError(
          '無法操作非自己發起的震動請求',
          'SHAKE_DIRECT_MESSAGE',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Validate friendship
      const isFriend = await DB.get.friend(user.userId, target.userId);
      if (!isFriend) {
        throw new StandardizedError(
          '對方不是好友, 不能發送視窗震動',
          'SHAKE_DIRECT_MESSAGE',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Validate shake cooldown
      const shakeId = `${user.userId}-${target.userId}`;
      if (SHAKE_COOLDOWN_MAP.has(shakeId)) {
        const cooldownTime = SHAKE_COOLDOWN_MAP.get(shakeId);
        if (Date.now() < cooldownTime) {
          throw new StandardizedError(
            '視窗震動不能太頻繁',
            'SHAKE_DIRECT_MESSAGE',
            'COOLDOWN',
            'COOLDOWN',
            429,
          );
        }
      }

      let targetSocket;
      io.sockets.sockets.forEach((_socket) => {
        if (_socket.userId === target.userId) {
          targetSocket = _socket;
        }
      });

      // Validate target socket is online
      if (!targetSocket) {
        throw new StandardizedError(
          '對方不在線, 不能發送視窗震動',
          'SHAKE_DIRECT_MESSAGE',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Emit shake message and set cooldown
      io.to(targetSocket.id).emit('shakeDirectMessage', {
          userId: user.userId, // sender
          targetName: user.name, // sender name
          targetId: target.userId, // receiver
      });
      SHAKE_COOLDOWN_MAP.set(shakeId, Date.now() + SHAKE_COOLDOWN_MS);

      new Logger('Message').success(
        `User(${user.userId}) shake User(${target.userId})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `震動用戶時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SHAKE_DIRECT_MESSAGE',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (to the operator)
      io.to(socket.id).emit('error', error);

      new Logger('Message').error(
        `Error shaking user: ${error.error_message} (${socket.id})`,
      );
    }
  },
};

module.exports = { ...messageHandler };
