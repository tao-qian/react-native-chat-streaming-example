import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GiftedChat, IMessage, Bubble } from 'react-native-gifted-chat';
import { v4 as uuidv4 } from 'uuid';
import EventSource from 'react-native-sse';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function ChatScreen() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );
    setIsTyping(true);
    await fetchResponseFromOpenAI(newMessages[0].text);
  }, [messages]);

  const fetchResponseFromOpenAI = async (messageText: string) => {
    const eventSource = new EventSource('https://api.openai.com/v1/chat/completions',{
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }]
        .concat(
          messages.map(msg => ({
            role: msg.user.name === 'User' ? 'user' : 'assistant',
            content: msg.text,
        })))
        .concat([{ role: 'user', content: messageText }]),
        stream: true,
      })
    });

    const responseMessageId = uuidv4();
    setMessages((previousMessages) => {
      const newMessage = {
        _id: responseMessageId,
        text: '',
        createdAt: new Date(),
        user: { _id: 2, name: 'Bot' },
        pending: true,
      };
      return GiftedChat.append(previousMessages, [newMessage]);
    });

    const listener = (event: any) => {
      if (event.type === 'message' && event.data !== '[DONE]') {
        try {
          const parsed = JSON.parse(event.data);
          const content = parsed.choices[0]?.delta?.content || '';
          setMessages((previousMessages) => {
            return previousMessages.map((message) => {
              if (message._id === responseMessageId) {
                return { ...message, text: message.text + content };
              }
              return message;
            })
          });

          // Return to allow the event loop to continue when there is no error
          return;
        } catch (error) {
          console.error('Error parsing event data:', error, 'Raw data:', event.data);
        }
      } else if (event.type === 'error') {
        console.error('EventSource error:', event);
      }

      // Finished processing either because of an error or because of [DONE]
      setIsTyping(false);
      setMessages((previousMessages) => {
        return previousMessages.map((message) => {
          if (message._id === responseMessageId) {
            return { ...message, pending: false };
          }
          return message;
        })
      });
      eventSource.close();
    };

    eventSource.addEventListener('message', listener);
    eventSource.addEventListener('error', listener);
  };

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        renderBubble={ props => props.currentMessage.text ? <Bubble {...props} /> : null }
        renderAvatar={() => null}
        user={{
          _id: 1,
          name: 'User',
        }}
        isTyping={isTyping}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
