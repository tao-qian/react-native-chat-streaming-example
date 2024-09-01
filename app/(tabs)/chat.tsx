import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
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
    const messageText = newMessages[0].text;
    setIsTyping(true);
    await fetchResponseFromOpenAI(messageText);
  }, []);

  const fetchResponseFromOpenAI = async (messageText: string) => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    };

    const body = JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: messageText },
      ],
      stream: true,
    });

    const eventSource = new EventSource(url, { headers, method: 'POST', body });
    setMessages((previousMessages) => {
      const newMessage = {
        _id: uuidv4(),
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
            const updatedMessages = [...previousMessages];
            const lastMessage = updatedMessages.find((msg) => msg.pending);
            if (lastMessage) {
              lastMessage.text = lastMessage.text + content;
            }
            return updatedMessages;
          });

          return;
        } catch (error) {
          console.error('Error parsing event data:', error, 'Raw data:', event.data);
        }
      } else if (event.type === 'error') {
        console.error('EventSource error:', event);
      }
      setIsTyping(false);
      setMessages((previousMessages) => {
        const updatedMessages = [...previousMessages];
        const lastMessage = updatedMessages.find((msg) => msg.pending);
        if (lastMessage) lastMessage.pending = false;
        return updatedMessages;
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
        user={{
          _id: 1,
          name: 'User',
        }}
        isTyping={isTyping}
        maxInputLength={500}
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
