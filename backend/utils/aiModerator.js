export const checkMessageContent = async (text, messageId = "unknown") => {
    if (!text || !text.trim()) {
        return { is_toxic: false };
    }

    try {
        const aiServerUrl = process.env.AI_SERVER_URL || "http://127.0.0.1:8080";
        const response = await fetch(`${aiServerUrl}/check-message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: text.trim(),
                message_id: messageId,
            }),
        });

        if (!response.ok) {
            console.error(`AI API error response status: ${response.status}`);
            return { is_toxic: false };
        }

        const data = await response.json();
        return {
            is_toxic: !!data.is_toxic,
            source: data.source || "Unknown",
            confidence: data.confidence || 0,
        };
    } catch (error) {
        console.error("Failed to reach AI Moderation API:", error.message);
        return { is_toxic: false };
    }
};
