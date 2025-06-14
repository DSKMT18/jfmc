import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';

const ADMIN_ID = 6630766118;

export function setupBuyRankHandlers(Bot, pendingReasons) {
   // Обработка текста — причины одобрения/отказа
   Bot.on('text', async (ctx, next) => {
      const replyTo = ctx.message?.reply_to_message;

      if (replyTo) {
         const reasonData = pendingReasons.get(replyTo.message_id);
         if (reasonData) {
            const { messageId, userId, type, originalCaption, promptMessageId } = reasonData;
            const reason = ctx.message.text;

            const decisionText = type === 'approve' ? `✅ Заявка на покупку ранга одобрена @${ctx.from.username}` : `❌ Заявка на покупку ранга отклонена @${ctx.from.username}`;
            const finalCaption = `${originalCaption}\n<blockquote>\n${decisionText}\n<b>Причина:</b> ${reason}</blockquote>`;

            try {
               // Редактируем сообщение с заявкой
               await ctx.telegram.editMessageCaption(ctx.chat.id, messageId, undefined, finalCaption, {
                  reply_markup: null,
                  parse_mode: 'HTML',
               });
               // Уведомляем пользователя
               await ctx.telegram.sendMessage(userId, `<blockquote>${decisionText}\n<b>Примечание:</b> ${reason}</blockquote>`,
                  { parse_mode: 'HTML' }
               );

               // Удаляем сообщение с запросом причины
               try {
                  await ctx.telegram.deleteMessage(ctx.chat.id, promptMessageId);
               } catch (e) {
                  console.warn('Не удалось удалить сообщение бота (promptMessageId):', e.message);
               }

               // Удаляем ответ с причиной
               try {
                  await ctx.deleteMessage();
               } catch (e) {
                  console.warn('Не удалось удалить сообщение пользователя:', e.message);
               }
            } catch (err) {
               console.error(err);
            } finally {
               pendingReasons.delete(replyTo.message_id);
            }
            return;
         }
      }
      return next();
   });

   // Кнопка одобрения
   Bot.action(/^approve_(\d+)$/, async (ctx) => {
      if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Нет прав!');

      const userId = ctx.match[1];
      const message = ctx.callbackQuery.message;

      const prompt = await ctx.reply('Введите примечание для одобрения в ответ на это сообщение:');
      pendingReasons.set(prompt.message_id, {
         messageId: message.message_id,
         userId,
         type: 'approve',
         originalCaption: message.caption || 'Заявка',
         promptMessageId: prompt.message_id,
      });

      await ctx.answerCbQuery();
   });

   // Кнопка отказа
   Bot.action(/^reject_(\d+)$/, async (ctx) => {
      if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Нет прав!');

      const userId = ctx.match[1];
      const message = ctx.callbackQuery.message;

      const prompt = await ctx.reply('Введите примечание для отказа в ответ на это сообщение:');
      pendingReasons.set(prompt.message_id, {
         messageId: message.message_id,
         userId,
         type: 'reject',
         originalCaption: message.caption || 'Заявка',
         promptMessageId: prompt.message_id,
      });

      await ctx.answerCbQuery();
   });

   // Кнопка блокировки
   Bot.action(/^block_(\d+)$/, async (ctx) => {
      if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Нет прав!');

      const userId = parseInt(ctx.match[1]);
      const message = ctx.callbackQuery.message;

      try {
         // Читаем текущий черный список
         const blacklistData = await readFile('./blacklist.json', 'utf8').catch(() => '[]');
         const blacklist = JSON.parse(blacklistData);

         // Добавляем пользователя в черный список, если его там нет
         if (!blacklist.includes(userId)) {
            blacklist.push(userId);
            await writeFile('./blacklist.json', JSON.stringify(blacklist, null, 2));
         }

         // Обновляем сообщение с заявкой
         const finalCaption = `${message.caption || 'Заявка'}\n<blockquote>\n🚫 Пользователь @${ctx.from.username || 'неизвестный'} заблокирован\n</blockquote>`;
         await ctx.telegram.editMessageCaption(ctx.chat.id, message.message_id, undefined, finalCaption, {
            reply_markup: null,
            parse_mode: 'HTML',
         });

         // Уведомляем пользователя
         await ctx.telegram.sendMessage(userId, 'Вы были заблокированы и не можете отправлять заявки на покупку ранга.', {
            parse_mode: 'HTML',
         });

         await ctx.answerCbQuery('Пользователь заблокирован');
      } catch (err) {
         console.error('Ошибка при блокировке:', err);
         await ctx.answerCbQuery('Ошибка при блокировке');
      }
   });
}