'use server';

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
      parse_mode: 'Markdown',
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
    
    // If there was text but no caption, send it separately.
    if(text && !photoCaption){
       await sendTelegramMessage({botToken, chatId, text});
    }

  } else if (photoUrls.length === 1 && photoUrls[0]) {
      // Send a single photo
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const body = {
        chat_id: chatId,
        photo: photoUrls[0],
        caption: photoCaption || text,
        parse_mode: 'Markdown',
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
    // Send a simple text message
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
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
  }
}
