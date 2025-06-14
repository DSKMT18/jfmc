import { readFile } from 'fs/promises';

export const salaries = async (Bot, chatId) => {
   try {
      const fileData = await readFile('./ranks.json', 'utf-8');
      const data = JSON.parse(fileData);

      let message = `<b>[Зарплаты по рангам]</b>\n`;
      for (const rank of Object.values(data)) {
         message += `
<blockquote expandable><b>${rank.name}</b>
   <b>Зарплата в Payday:</b> <code>${(rank.zarplata / 2).toLocaleString('ru-RU')}$</code>
   <b>Зарплата в час:</b> <code>${rank.zarplata.toLocaleString('ru-RU')}$</code>
   <b>Зарплата в Payday c x2:</b> <code>${(rank.zarplata).toLocaleString('ru-RU')}$</code>
   <b>Зарплата в час c x2:</b> <code>${(rank.zarplata * 2).toLocaleString('ru-RU')}$</code>
   <b>Зарплата в Payday c x4:</b> <code>${(rank.zarplata * 2).toLocaleString('ru-RU')}$</code>
   <b>Зарплата в час c x4:</b> <code>${(rank.zarplata * 4).toLocaleString('ru-RU')}$</code></blockquote>`;
      }

      await Bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
   } catch (error) {
      console.error('Ошибка при чтении зарплат:', error);
      await Bot.telegram.sendMessage(chatId, 'Не удалось получить данные о зарплатах.', {
         parse_mode: 'HTML'
      });
   }
};
