import { readFile } from 'fs/promises';

export const ranks = async (Bot, chatId) => {
   try {
      const filePath = './ranks.json';
      const fileData = await readFile(filePath, 'utf-8');
      const data = JSON.parse(fileData);

      let message = `<b>[Цены на ранги]</b>`;

      for (const rank of Object.values(data)) {
         if (rank.name === '5️⃣ Окулист') continue; // полностью пропустить

         message += `\n<blockquote><b>${rank.name}</b>\n`;
         message += `<b>Цена:</b> ${rank.price.toLocaleString('ru-RU')}$ / день\n[${(rank.price * 30).toLocaleString('ru-RU')}$ / мес.]\n`;
         message += `<b>Мин. срок:</b> ${rank.min_days} дн.</blockquote>`;
      }

      message += `\n*цены могут быть изменены в любой момент`;

      await Bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });

   } catch (error) {
      console.error('Ошибка при чтении или парсинге JSON:', error);
      await Bot.telegram.sendMessage(chatId, 'Произошла ошибка при получении цен.', { parse_mode: 'HTML' });
   }
};
