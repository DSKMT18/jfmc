export const freeRanks = async (Bot, chatId) => {
   try {
      const response = await fetch(`https://pastebin.com/raw/0Vx3hgAg?nocache=${Date.now()}`);;
      if (!response.ok) {
         throw new Error('Network response was not ok');
      }
      const data = await response.json();
      await Bot.telegram.sendMessage(
         chatId,
         `<b>[Свободные ранги]</b>\n` +
         `<blockquote><b>Дата обновления:</b> <code>${data.update} [MSK]</code>\n` +
         `<b>Заведующий Клиникой[8]:</b> <code>${data.ranks.eight}/11</code>\n` +
         `<b>Заведующий Отделением[7]:</b> <code>${data.ranks.seven}/22</code>\n` +
         `<b>Хирург[6]:</b> <code>${data.ranks.six}/28</code></blockquote>`,
         { parse_mode: 'HTML' }
      );
   } catch (error) {
      console.error('Ошибка при получении или парсинге JSON:', error);
      await Bot.telegram.sendMessage(
         chatId,
         'Произошла ошибка при получении данных.',
         { parse_mode: 'HTML' }
      );
   }
};