import React, { useLayoutEffect, useRef } from 'react';

// CSS
import styles from '@/styles/viewers/message.module.css';
import permission from '@/styles/permission.module.css';
import vip from '@/styles/vip.module.css';

// Components
import MarkdownViewer from '@/components/viewers/Markdown';

// Types
import type { ChannelMessage, DirectMessage, InfoMessage, WarnMessage, MemberEvent } from '@/types';

// Providers
import { useLanguage } from '@/providers/Language';

interface DirectMessageTabProps {
  messageGroup: DirectMessage & {
    contents: string[];
  };
}

const DirectMessageTab: React.FC<DirectMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    // Hooks
    const lang = useLanguage();

    // Variables
    const {
      name: senderName,
      contents: messageContents,
      timestamp: messageTimestamp,
    } = messageGroup;
    const timestamp = lang.getFormatTimestamp(messageTimestamp);

    const processContent = (content: string) => {
      return content.replace(
        /{{GUEST_SEND_AN_EXTERNAL_LINK}}/g,
        lang.tr.GUEST_SEND_AN_EXTERNAL_LINK,
      );
    };

    return (
      <div className={styles['messageBox']}>
        <div className={styles['header']}>
          <div className={styles['username']}>{senderName}</div>
          <div className={styles['timestamp']}>{timestamp}</div>
        </div>
        {messageContents.map((content, index) => (
          <div key={index} className={styles['content']}>
            <MarkdownViewer markdownText={processContent(content)} />
          </div>
        ))}
      </div>
    );
  },
);

DirectMessageTab.displayName = 'DirectMessageTab';

interface ChannelMessageTabProps {
  messageGroup: ChannelMessage & {
    contents: string[];
  };
  forbidGuestUrl?: boolean;
}

const ChannelMessageTab: React.FC<ChannelMessageTabProps> = React.memo(
  ({ messageGroup, forbidGuestUrl = false }) => {
    // Hooks
    const lang = useLanguage();

    // Variables
    const {
      gender: senderGender,
      name: senderName,
      vip: senderVip,
      nickname: senderNickname,
      permissionLevel: messagePermission,
      contents: messageContents,
      timestamp: messageTimestamp,
    } = messageGroup;
    const timestamp = lang.getFormatTimestamp(messageTimestamp);

    const processContent = (content: string) => {
      return content.replace(
        /{{GUEST_SEND_AN_EXTERNAL_LINK}}/g,
        lang.tr.GUEST_SEND_AN_EXTERNAL_LINK,
      );
    };

    return (
      <>
        <div
          className={`${styles['senderIcon']} ${permission[senderGender]} ${
            permission[`lv-${messagePermission}`]
          }`}
        />
        <div className={styles['messageBox']}>
          <div className={styles['header']}>
            {senderVip > 0 && (
              <div
                className={`${vip['vipIcon']} ${vip[`vip-small-${senderVip}`]}`}
              ></div>
            )}
            <div className={styles['username']}>
              {senderNickname || senderName}
            </div>
            <div className={styles['timestamp']}>{timestamp}</div>
          </div>
          {messageContents.map((content, index) => (
            <div key={index} className={styles['content']}>
              <MarkdownViewer
                markdownText={processContent(content)}
                forbidGuestUrl={forbidGuestUrl}
              />
            </div>
          ))}
        </div>
      </>
    );
  },
);

ChannelMessageTab.displayName = 'ChannelMessageTab';

interface InfoMessageTabProps {
  messageGroup: InfoMessage & {
    contents: string[];
  };
  forbidGuestUrl?: boolean;
}

const InfoMessageTab: React.FC<InfoMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    const lang = useLanguage();
    const { contents: messageContents } = messageGroup;

    const getTranslatedContent = (content: string) => {
      if (content.includes(' ')) {
        const [key, ...params] = content.split(' ');
        if (Object.prototype.hasOwnProperty.call(lang.tr, key)) {
          let translatedText = lang.tr[key as keyof typeof lang.tr];
          params.forEach((param, index) => {
            translatedText = translatedText.replace(`{${index}}`, param);
          });
          return translatedText;
        }
      }
      return Object.prototype.hasOwnProperty.call(lang.tr, content)
        ? lang.tr[content as keyof typeof lang.tr]
        : content;
    };

    return (
      <>
        <div className={styles['infoIcon']} />
        <div className={styles['messageBox']}>
          {messageContents.map((content, index) => (
            <div key={index}>
              <MarkdownViewer markdownText={getTranslatedContent(content)} />
            </div>
          ))}
        </div>
      </>
    );
  },
);

InfoMessageTab.displayName = 'InfoMessageTab';

interface WarnMessageTabProps {
  messageGroup: WarnMessage & {
    contents: string[];
  };
  forbidGuestUrl?: boolean;
}

const WarnMessageTab: React.FC<WarnMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    const lang = useLanguage();
    const { contents: messageContents } = messageGroup;

    const getTranslatedContent = (content: string) => {
      if (content.includes(' ')) {
        const [key, ...params] = content.split(' ');
        if (Object.prototype.hasOwnProperty.call(lang.tr, key)) {
          let translatedText = lang.tr[key as keyof typeof lang.tr];
          params.forEach((param, index) => {
            translatedText = translatedText.replace(`{${index}}`, param);
          });
          return translatedText;
        }
      }
      return Object.prototype.hasOwnProperty.call(lang.tr, content)
        ? lang.tr[content as keyof typeof lang.tr]
        : content;
    };

    return (
      <>
        <div className={styles['warnIcon']} />
        <div className={styles['messageBox']}>
          {messageContents.map((content, index) => (
            <div key={index}>
              <MarkdownViewer markdownText={getTranslatedContent(content)} />
            </div>
          ))}
        </div>
      </>
    );
  },
);

WarnMessageTab.displayName = 'WarnMessageTab';

interface MemberEventTabProps {
  messageGroup: MemberEvent & {
    contents: string[];
  };
  forbidGuestUrl?: boolean;
}

const MemberEventTab: React.FC<MemberEventTabProps> = React.memo(
  ({ messageGroup }) => {
    const lang = useLanguage();
    const {
      gender: senderGender,
      name: senderName,
      nickname: senderNickname,
      contents: messageContents
    } = messageGroup;

    const getFormatContent = (content: string) => {
      var permissionLevel, messageContent;
      if (content.includes(':')) {
        const params = content.split(':');
        permissionLevel = params[0];
        messageContent = params[1];
      }
      return (
        <>
        <div className={`${styles['header']} ${styles['eventHeader']}`}>
          <div
            className={`${styles['senderIcon']}
              ${permission[senderGender]}
              ${permission[`lv-${permissionLevel}`]
            }`}
          />
          <div className={styles['username']}>
            {permissionLevel !== '2' ? senderNickname: senderName}
          </div>
          <div className={styles['content']}>
            {messageContent}
          </div>
        </div>
        </>
      );
    };

    return (
      <>
        <div className={styles['infoIcon']} />
        <div className={styles['messageBox']}>
          {messageContents.map((content, index) => (
            <div key={index}>
              {getFormatContent(content)}
            </div>
          ))}
        </div>
      </>
    );
  },
);

MemberEventTab.displayName = 'MemberEventTab';

type MessageGroup = (DirectMessage | ChannelMessage | InfoMessage | WarnMessage | MemberEvent) & {
  type: 'general' | 'info' | 'warn' | 'event' | 'dm';
  contents: string[];
};

interface MessageViewerProps {
  messages: DirectMessage[] | ChannelMessage[] | InfoMessage[] | WarnMessage[] | MemberEvent[];
  forbidGuestUrl?: boolean;
}

const MessageViewer: React.FC<MessageViewerProps> = React.memo(
  ({ messages, forbidGuestUrl = false }) => {
    // Variables
    const sortedMessages = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    console.log(sortedMessages);
    const messageGroups = sortedMessages.reduce<MessageGroup[]>(
      (acc, message) => {
        const lastGroup = acc[acc.length - 1];
        const timeDiff = lastGroup && message.timestamp - lastGroup.timestamp;
        const nearTime = lastGroup && timeDiff <= 5 * 60 * 1000;
        const sameType = lastGroup && message.type === lastGroup.type;
        const isInfo = message.type === 'info';
        const isWarn = message.type === 'warn';
        const isEvent = message.type === 'event';
        const isGeneral = message.type === 'general';
        const isDm = message.type === 'dm';
        const sameSender =
          lastGroup &&
          !isInfo && !isWarn && !isEvent &&
          ((isGeneral &&
            lastGroup.type === 'general' &&
            message.senderId === lastGroup.senderId) ||
            (isDm &&
              lastGroup.type === 'dm' &&
              message.senderId === lastGroup.senderId));

        if (sameSender && nearTime && sameType && !isInfo) {
          lastGroup.contents.push(message.content);
        } else {
          acc.push({
            ...message,
            contents: [message.content],
          });
        }
        return acc;
      },
      [],
    );

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effects
    useLayoutEffect(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    }, [messageGroups]);
    return (
      <div className={styles['messageViewerWrapper']}>
        {messageGroups.map((messageGroup, index) => {
          return (
            <div key={index} className={styles['messageWrapper']}>
              {messageGroup.type === 'info' ? (
                <InfoMessageTab
                  messageGroup={messageGroup}
                  forbidGuestUrl={forbidGuestUrl}
                />
              ) : messageGroup.type === 'warn' ? (
                <WarnMessageTab
                  messageGroup={messageGroup}
                  forbidGuestUrl={forbidGuestUrl}
                />
              ) : messageGroup.type === 'event' ? (
                <MemberEventTab
                  messageGroup={messageGroup}
                  forbidGuestUrl={forbidGuestUrl}
                />
              ) : messageGroup.type === 'general' ? (
                <ChannelMessageTab
                  messageGroup={messageGroup}
                  forbidGuestUrl={forbidGuestUrl}
                />
              ) : messageGroup.type === 'dm' ? (
                <DirectMessageTab messageGroup={messageGroup} />
              ) : null}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    );
  },
);

MessageViewer.displayName = 'MessageViewer';

export default MessageViewer;
