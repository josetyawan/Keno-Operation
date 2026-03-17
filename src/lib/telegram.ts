'use server';

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

// A simple utility to send a message to a Telegram chat.
export async function sendTelegramMessage({
  botToken,
  chatId,
  text,
  photoUrls = [],
  photoCaption
}: {
  botToken: string;
  chatId: string;
  text?: string;
  photoUrls?: string[];
  photoCaption?: string;
}) {
  if (!text && (!photoUrls || photoUrls.length === 0)) {
    console.warn('sendTelegramMessage called with no text or photos.');
    return;
  }

  const sendRequest = async (url: string, body: object) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body');
        console.error('Telegram API HTTP error:', response.status, response.statusText, errorBody);
        // The error body from Telegram is often helpful JSON, so include it.
        throw new Error(`Telegram API Error: ${errorBody}`);
    }

    // A 200 OK response from Telegram with an empty body is a success.
    // If there is a body, we can try to parse it for more details, but success is assumed unless explicitly told otherwise.
    const responseText = await response.text();
    if (responseText) {
        try {
            const result = JSON.parse(responseText);
            // If Telegram explicitly says it's not OK in the JSON body, we should treat it as an error.
            if (!result.ok) {
                console.error('Telegram API business logic error:', result);
                throw new Error(`Telegram API Error: ${result.description || 'Unknown error'}`);
            }
        } catch (e) {
            // This can happen if Telegram sends a 200 OK with a non-JSON body.
            // Since the HTTP status was success, we can log it but not fail the operation.
            console.warn('Could not parse successful Telegram API response, but assuming message was sent.', responseText);
        }
    }
  };

  if (photoUrls.length > 1) {
    // Send as a media group
    const media = photoUrls.map((url, index) => ({
      type: 'photo',
      media: url,
      caption: index === 0 ? (photoCaption || text) : '',
    }));
    
    for (let i = 0; i < media.length; i += 10) {
        const chunk = media.slice(i, i + 10);
        await sendRequest(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
          chat_id: chatId,
          media: chunk,
        });
    }

  } else if (photoUrls.length === 1 && photoUrls[0]) {
      // Send a single photo
      await sendRequest(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        chat_id: chatId,
        photo: photoUrls[0],
        caption: photoCaption || text,
      });

  } else if (text) {
    if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        await sendRequest(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: text,
        });
    } else {
        // If the message is too long, split it into chunks.
        const chunks: string[] = [];
        let remainingText = text;

        while (remainingText.length > 0) {
            if (remainingText.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
                chunks.push(remainingText);
                break;
            }

            let splitPos = remainingText.lastIndexOf('\n', TELEGRAM_MAX_MESSAGE_LENGTH);
            if (splitPos === -1 || splitPos === 0) {
                splitPos = TELEGRAM_MAX_MESSAGE_LENGTH;
            }

            chunks.push(remainingText.substring(0, splitPos));
            remainingText = remainingText.substring(splitPos + 1);
        }

        // Send each chunk as a separate message.
        for (const chunk of chunks) {
            if (!chunk.trim()) continue;
            await sendRequest(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: chunk,
            });
            await new Promise(resolve => setTimeout(resolve, 300)); // Delay to avoid rate-limiting
        }
    }
  }
}
