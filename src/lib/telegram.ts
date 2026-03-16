
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

  if (photoUrls.length > 1) {
    // Send as a media group
    const media = photoUrls.map((url, index) => ({
      type: 'photo',
      media: url,
      caption: index === 0 ? (photoCaption || text) : '',
    }));
    
    // Split media into chunks of 10
    for (let i = 0; i < media.length; i += 10) {
        const chunk = media.slice(i, i + 10);
        const url = `https://api.telegram.org/bot${botToken}/sendMediaGroup`;
        const body = {
          chat_id: chatId,
          media: chunk,
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        const result = await response.json();
        if (!result.ok) {
          console.error('Telegram API error (sendMediaGroup):', result);
          throw new Error(`Telegram API Error: ${result.description}`);
        }
    }

  } else if (photoUrls.length === 1 && photoUrls[0]) {
      // Send a single photo
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const body = {
        chat_id: chatId,
        photo: photoUrls[0],
        caption: photoCaption || text,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) {
        console.error('Telegram API error (sendPhoto):', result);
        throw new Error(`Telegram API Error: ${result.description}`);
      }
      return result;

  } else if (text) {
    if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        // If the message is short enough, send it as is.
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const body = {
          chat_id: chatId,
          text: text,
        };
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        const result = await response.json();
        if (!result.ok) {
          console.error('Telegram API error (sendMessage):', result);
          throw new Error(`Telegram API Error: ${result.description}`);
        }
        return result;
    } else {
        // If the message is too long, split it into chunks.
        const chunks: string[] = [];
        let remainingText = text;

        while (remainingText.length > 0) {
            if (remainingText.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
                chunks.push(remainingText);
                break;
            }

            // Find the last newline within the character limit
            let splitPos = remainingText.lastIndexOf('\n', TELEGRAM_MAX_MESSAGE_LENGTH);

            // If no newline is found within the limit, we have to split mid-word.
            if (splitPos === -1) {
                splitPos = TELEGRAM_MAX_MESSAGE_LENGTH;
            }

            // If the last newline is at the very beginning, it means the first line is too long.
            // In this case, we have no choice but to split by the max length.
            if (splitPos === 0) {
                splitPos = TELEGRAM_MAX_MESSAGE_LENGTH;
            }

            chunks.push(remainingText.substring(0, splitPos));
            // The +1 skips the newline character for the next chunk.
            remainingText = remainingText.substring(splitPos + 1);
        }

        // Send each chunk as a separate message.
        for (const chunk of chunks) {
            if (!chunk.trim()) continue; // Don't send empty chunks.

            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const body = {
                chat_id: chatId,
                text: chunk,
            };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await response.json();

            if (!result.ok) {
                console.error('Telegram API error (sendMessage chunk):', result);
                throw new Error(`Telegram API Error on chunk: ${result.description}`);
            }
            // Add a small delay between messages to avoid rate-limiting.
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
  }
}
