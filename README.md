# OpenAI Chat with Streaming in React Native

This is a minimal exmaple for a chat app with streaming support in React Native, using `react-native-gifted-chat` and `react-native-sse`.

The alternative approach for streaming is fetch with Polyfill: https://github.com/expo/expo/discussions/21710. However, that's harder to set up and also has some performance issues.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```
2. Update .env file with your OpenAI API key.
3. Start the app

   ```bash
    npx expo start
   ```