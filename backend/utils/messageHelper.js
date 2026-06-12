export const updateConversationAfterCreateMessage = (conversation, message, senderId) => {
    const sIdStr = senderId.toString();

    // 1. Cập nhật các thông tin cơ bản
    conversation.set({
        seenBy: [senderId], // Có thể thêm luôn người gửi vào danh sách đã xem
        lastMessageAt: message.createdAt,
        lastMessage: {
            _id: message._id,
            content: message.content,
            senderId: senderId,
            createdAt: message.createdAt
        }
    });

    // 2. Cập nhật số tin nhắn chưa đọc cho từng thành viên
    if (conversation.participants && conversation.unreadCounts) {
        conversation.participants.forEach((p) => {
            const memberId = p.userId.toString();
            const isSender = memberId === sIdStr;

            const prevCount = conversation.unreadCounts.get(memberId) || 0;

            // Nếu là người gửi -> reset về 0
            // Nếu là người nhận -> tăng thêm 1
            conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
        });
    }
};