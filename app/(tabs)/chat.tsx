import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { v4 as uuidv4 } from 'uuid';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_API_URL;

export default function ChatScreen() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );
    const messageText = newMessages[0].text;
    setIsTyping(true);

    fetchResponseFromOpenAI(messageText);
  }, []);

  const fetchResponseFromOpenAI = async (messageText: string) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: messageText },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '').map(line => line.replace(/^data: /, ''));

        for (const line of lines) {
          if (line === '[DONE]') {
            setIsTyping(false);
            return;
          }

          const parsed = JSON.parse(line);
          const content = parsed.choices[0]?.delta?.content || '';
          completeResponse += content;

          setMessages((previousMessages) => {
            const newMessage = {
              _id: uuidv4(),
              text: completeResponse,
              createdAt: new Date(),
              user: { _id: 2, name: 'Bot' },
              pending: true,
            };
            return GiftedChat.append(previousMessages, [newMessage]);
          });
        }
      }

      setMessages((previousMessages) => {
        const updatedMessages = [...previousMessages];
        const lastMessage = updatedMessages.find((msg) => msg.pending);
        if (lastMessage) lastMessage.pending = false;
        return updatedMessages;
      });

    } catch (error) {
      console.error('Error fetching response from OpenAI:', error);
      setIsTyping(false);
    }
  };

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={(messages) => onSend(messages)}
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
