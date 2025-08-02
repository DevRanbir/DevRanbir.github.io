# Website Chatbox with Firebase Integration

This chatbox system creates a seamless communication channel between your website visitors and support team, with all messages stored in Firebase for persistence and real-time updates.

## System Architecture

```
Website Chatbox (Anonymous Users)
            ↓↑
       Firebase Firestore (Thread-based Storage)
            ↓↑
      Support Team Interface
```

## Features

### 🔒 **Anonymous User System**
- Automatic generation of anonymous user IDs
- Optional user names (for personalization)
- No personal data collection beyond what user provides
- Persistent chat sessions using localStorage

### 💬 **Real-time Chat**
- Live message synchronization via Firebase
- Typing indicators
- Message timestamps
- Support for both user and support messages
- Automatic scrolling to latest messages

### 💾 **Thread-based Storage**
- Messages organized by user threads
- Structured data with thread IDs and message IDs
- Support for multiple conversations per user
- Automatic message expiration and cleanup

### 🎨 **Modern UI**
- Responsive design for all devices
- Fullscreen mode support
- Smooth animations and transitions
- Status indicators (online/offline)
- Dark theme integration

## How It Works

### 1. User Interaction Flow
1. User visits the website and clicks on Chatbox
2. User enters optional name and starts chat
3. Anonymous user ID is generated and stored locally
4. User sends messages which are stored in Firebase
5. User receives real-time responses from support team

### 2. Support Response Flow
1. Support team can view all active threads
2. Support team responds to user messages
3. Response is stored in the user's thread
4. User sees the response in real-time

### 3. Data Storage Structure

Firebase stores messages in thread-based structure:
```javascript
{
  userId: "user_1625097600000_abc123def",
  userName: "John Doe",
  supportAgentName: "Support Bot",
  createdAt: "2023-07-01T12:00:00.000Z",
  lastUpdated: "2023-07-01T12:30:00.000Z",
  messages: {
    msg_001: {
      sender: "user",
      message: "User's message text",
      timestamp: "2023-07-01T12:00:00.000Z",
      expiresAt: "2023-07-01T14:00:00.000Z"
    },
    msg_002: {
      sender: "support",
      message: "Support response",
      timestamp: "2023-07-01T12:30:00.000Z",
      expiresAt: "2023-07-01T14:30:00.000Z"
    }
  }
}
```

## Setup Instructions

### 1. Firebase Setup (Already Configured)
- ✅ Firebase project configured
- ✅ Firestore collections set up
- ✅ Real-time listeners implemented
- ✅ Thread-based message structure implemented
- ✅ Message storage functions ready

### 2. Ready to Use
The chatbox is fully configured and ready to use:
- Thread-based message storage
- Real-time chat functionality
- Automatic message cleanup
- Anonymous user support

## Usage

### For Website Visitors
1. Navigate to the Contacts page
2. Click on "Chatbox" in the navigation
3. Enter your name (optional) and start chatting
4. Send messages and receive responses in real-time
5. Use fullscreen mode for better experience

### For Support Team
Support responses can be added programmatically using the `sendSupportResponse` function.
3. Responses automatically appear on the website
4. Monitor all conversations from one place

## Testing the System

### Quick Test (Without Telegram)
1. Go to the chatbox
2. Send a message
3. Click the "Test" button in the chatbox header
4. You should see a test response appear

### Thread Structure Test
1. Send multiple messages from the website
2. Check Firebase console to see thread structure
3. Verify messages are organized properly
4. Test message cleanup functionality

## File Structure

```
src/
├── components/
│   ├── ChatBox.js              # Main chatbox component
│   ├── Contacts.js             # Updated to use ChatBox
│   └── Contacts.css            # Enhanced styles
├── firebase/
│   └── firestoreService.js     # Firebase functions (updated)
└── utils/
    └── chatCleanup.js          # Message cleanup utilities
```

## Security Considerations

### 🔐 **User Privacy**
- Anonymous user identification
- No personal data stored beyond what user provides
- Messages can be deleted/cleared
- Local storage for session persistence only

### 🛡️ **Data Protection**
- Firebase security rules (should be configured)
- HTTPS for all communications
- Thread-based data organization
- Automatic cleanup and data retention

### 🔒 **API Security**
- Environment variables for configuration
- CORS configuration
- Error handling without data leakage
- Thread-based access control

## Monitoring & Analytics

### Message Analytics
- Track message volume
- Response time metrics
- User engagement patterns
- Support team performance

### System Health
- Firebase connection status
- Thread creation and updates
- Error rate monitoring
- Performance metrics

## Customization Options

### UI Customization
- Modify colors in `Contacts.css`
- Adjust animation timings
- Customize message bubble styles
- Add emoji reactions

### Functionality Extensions
- File/image sharing
- Message reactions
- Typing indicators
- Read receipts
- Message search
- Chat history export

## Troubleshooting

### Common Issues
1. **Messages not sending**: Check Firebase configuration
2. **Telegram not receiving**: Verify bot token and webhook
3. **Responses not appearing**: Check webhook handler
4. **Styling issues**: Clear browser cache

### Debug Mode
Enable console logging to see detailed information:
```javascript
// In ChatBox.js, enable debug logging
const DEBUG_MODE = true;
```

## Future Enhancements

### Planned Features
- [ ] Admin dashboard for managing chats
- [ ] Chat analytics and reporting
- [ ] Multiple support agents
- [ ] Chat routing and assignment
- [ ] Automated responses/chatbots
- [ ] Multi-language support
- [ ] Voice message support
- [ ] Screen sharing capabilities

### Integration Possibilities
- [ ] WhatsApp Business API
- [ ] Discord integration
- [ ] Slack integration
- [ ] Email fallback
- [ ] SMS notifications
- [ ] Push notifications

## Support

If you need help setting up or customizing this chatbox system:

1. Check the troubleshooting section
2. Review the setup instructions
3. Test with the built-in test button
4. Check browser console for errors
5. Verify Firebase and Telegram configurations

## License

This chatbox system is part of your portfolio website and can be customized and extended as needed for your specific requirements.
