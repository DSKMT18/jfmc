import { readFile } from 'fs/promises';
import { Scenes, Markup } from 'telegraf';

export const buyRankScene = new Scenes.WizardScene(
   'BUY_RANK_SCENE',
   // Шаг 1: Запрос никнейма
   async (ctx) => {
      await ctx.reply(
         'Пожалуйста, введите ваш никнейм в формате Nick_Name (без цифр):',
         Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
      );
      return ctx.wizard.next();
   },
   // Шаг 2: Выбор ранга
   async (ctx) => {
      try {
         // Обработка нажатия кнопки "Отмена"
         if (ctx.callbackQuery?.data === 'cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('Покупка ранга отменена.');
            try {
               await ctx.editMessageReplyMarkup({ reply_markup: null });
            } catch (err) {
               console.error('Ошибка при удалении клавиатуры (cancel):', err.message);
            }
            return ctx.scene.leave();
         }

         // Проверка, что сообщение содержит текст
         if (!ctx.message?.text) {
            await ctx.reply('Пожалуйста, введите никнейм текстом или нажмите "Отмена".');
            return;
         }

         const nickname = ctx.message.text.trim();
         const nicknameRegex = /^[A-Z][a-zA-Z]*_[A-Z][a-zA-Z]*$/;

         // Проверка формата никнейма
         if (!nicknameRegex.test(nickname)) {
            await ctx.reply('Никнейм должен быть в формате Nick_Name.');
            return;
         }

         // Попытка удалить клавиатуру предыдущего сообщения
         try {
            await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, ctx.message.message_id - 1, undefined, { reply_markup: null });
         } catch (err) {
            console.error('Ошибка при удалении клавиатуры предыдущего сообщения:', err.message);
            // Продолжаем выполнение, так как это не критично
         }

         ctx.wizard.state.nickname = nickname;

         // Чтение и парсинг ranks.json
         let ranks;
         try {
            const filedata = await readFile('./ranks.json', 'utf8');
            ranks = JSON.parse(filedata);
         } catch (err) {
            console.error('Ошибка при чтении или парсинге ranks.json:', err.message);
            await ctx.reply('Произошла ошибка при загрузке рангов. Попробуйте позже.');
            return ctx.scene.leave();
         }

         // Формирование кнопок с рангами
         const buttons = Object.values(ranks)
            .filter(rank => rank.name !== "5️⃣ Окулист")
            .map((rank) => {
               const cleanRankName = rank.name.replace(/[^a-zA-Z0-9]/g, '');
               return [Markup.button.callback(`${rank.name}`, `rank_${cleanRankName}`)];
            });

         // Отправка сообщения с выбором ранга
         await ctx.reply(
            'Выберите ранг:',
            Markup.inlineKeyboard([...buttons, [Markup.button.callback('Отмена', 'cancel')]])
         );

         return ctx.wizard.next();
      } catch (err) {
         // Общая обработка ошибок
         console.error('Ошибка в шаге 2 BUY_RANK_SCENE:', err.message);
         await ctx.reply('Произошла ошибка. Попробуйте позже.');
         return ctx.scene.leave();
      }
   },
   // Шаг 3: Выбор количества дней (30 или 60)
   async (ctx) => {
      try {
         // Изменено: Обработка callback-запросов
         if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;

            if (data === 'cancel') {
               await ctx.answerCbQuery();
               await ctx.reply('Покупка ранга отменена.');
               try {
                  await ctx.editMessageReplyMarkup({ reply_markup: null });
               } catch (err) {
                  console.error('Ошибка при удалении клавиатуры (cancel):', err.message);
               }
               return ctx.scene.leave();
            }

            if (data.startsWith('rank_')) {
               ctx.wizard.state.rank = data.replace('rank_', '');

               await ctx.answerCbQuery();
               try {
                  await ctx.editMessageReplyMarkup({ reply_markup: null });
               } catch (err) {
                  console.error('Ошибка при удалении клавиатуры (rank):', err.message);
               }

               // Добавлено: Отправка сообщения с кнопками 30 и 60 дней
               await ctx.reply(
                  'Выберите количество дней:',
                  Markup.inlineKeyboard([
                     [Markup.button.callback('30 дней', 'days_30')],
                     [Markup.button.callback('60 дней', 'days_60')],
                     [Markup.button.callback('Отмена', 'cancel')]
                  ])
               );
               return ctx.wizard.next();
            }

            await ctx.answerCbQuery();
            await ctx.reply('Пожалуйста, выберите ранг из предложенных кнопок.');
            return;
         }

         // Изменено: Удалена проверка текстового ввода, так как ожидается только callback
         await ctx.reply(
            'Пожалуйста, выберите ранг из предложенных кнопок.',
            Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
         );
         return;
      } catch (err) {
         console.error('Ошибка в шаге 3 BUY_RANK_SCENE:', err.message);
         await ctx.reply('Произошла ошибка. Попробуйте позже.');
         return ctx.scene.leave();
      }
   },
   // Шаг 4: Обработка выбора дней и запрос скриншота
   async (ctx) => {
      try {
         // Изменено: Проверка callback-запроса вместо текста
         if (ctx.callbackQuery?.data === 'cancel') {
            await ctx.answerCbQuery();
            try {
               await ctx.editMessageReplyMarkup({ reply_markup: null });
            } catch (err) {
               console.error('Ошибка при удалении клавиатуры (cancel):', err.message);
            }
            await ctx.reply('Покупка ранга отменена.');
            return ctx.scene.leave();
         }

         // Добавлено: Обработка выбора количества дней
         if (ctx.callbackQuery?.data.startsWith('days_')) {
            const days = parseInt(ctx.callbackQuery.data.replace('days_', ''));
            if (![30, 60].includes(days)) {
               await ctx.answerCbQuery();
               await ctx.reply('Пожалуйста, выберите 30 или 60 дней.');
               return;
            }

            await ctx.answerCbQuery();
            try {
               await ctx.editMessageReplyMarkup({ reply_markup: null });
            } catch (err) {
               console.error('Ошибка при удалении клавиатуры (days):', err.message);
            }

            // Чтение ranks.json
            let ranks;
            try {
               const filedata = await readFile('./ranks.json', 'utf8');
               ranks = JSON.parse(filedata);
            } catch (err) {
               console.error('Ошибка при чтении или парсинге ranks.json:', err.message);
               await ctx.reply('Произошла ошибка при загрузке рангов. Попробуйте позже.');
               return ctx.scene.leave();
            }

            const selectedRank = Object.values(ranks).find(
               (r) => r.name.replace(/[^a-zA-Z0-9]/g, '') === ctx.wizard.state.rank
            );

            if (!selectedRank) {
               console.error('Ошибка: Ранг не найден, искомое имя:', ctx.wizard.state.rank);
               await ctx.reply('Ошибка: ранг не найден.');
               return ctx.scene.leave();
            }

            // Изменено: Проверка минимального количества дней
            if (days < selectedRank.min_days) {
               await ctx.reply(
                  `Минимальное количество дней для этого ранга: ${selectedRank.min_days}`,
                  Markup.inlineKeyboard([
                     [Markup.button.callback('30 дней', 'days_30')],
                     [Markup.button.callback('60 дней', 'days_60')],
                     [Markup.button.callback('Отмена', 'cancel')]
                  ])
               );
               return;
            }

            ctx.wizard.state.days = days;
            ctx.wizard.state.fullRankName = selectedRank.name;
            ctx.wizard.state.price = selectedRank.price;
            ctx.wizard.state.totalCost = selectedRank.price * days;

            await ctx.reply(
               'Пожалуйста, отправьте скриншот вашей статистики или нажмите "Отмена".',
               Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
            );
            return ctx.wizard.next();
         }

         await ctx.reply(
            'Пожалуйста, выберите количество дней из предложенных кнопок.',
            Markup.inlineKeyboard([
               [Markup.button.callback('30 дней', 'days_30')],
               [Markup.button.callback('60 дней', 'days_60')],
               [Markup.button.callback('Отмена', 'cancel')]
            ])
         );
         return;
      } catch (err) {
         console.error('Ошибка в шаге 4 BUY_RANK_SCENE:', err.message);
         await ctx.reply('Произошла ошибка. Попробуйте позже.');
         return ctx.scene.leave();
      }
   },
   // Шаг 5: Подитоговое окно
   async (ctx) => {
      try {
         if (ctx.callbackQuery?.data === 'cancel') {
            await ctx.answerCbQuery();
            try {
               await ctx.editMessageReplyMarkup({ reply_markup: null });
            } catch (err) {
               console.error('Ошибка при удалении клавиатуры (cancel):', err.message);
            }
            await ctx.reply('Покупка ранга отменена.');
            return ctx.scene.leave();
         }

         if (!ctx.message?.photo) {
            await ctx.reply(
               'Пожалуйста, отправьте изображение со статистикой или нажмите "Отмена".',
               Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
            );
            return;
         }

         const lastPhoto = ctx.message.photo[ctx.message.photo.length - 1].file_id;
         ctx.wizard.state.photoId = lastPhoto;

         const { nickname, fullRankName, days, price, totalCost } = ctx.wizard.state;

         await ctx.replyWithPhoto(lastPhoto, {
            caption:
               `<b>Подтвердите вашу заявку:</b>\n\n` +
               `<b>Никнейм:</b> <code>${nickname}</code>\n` +
               `<b>Ранг:</b> <code>${fullRankName}</code>\n` +
               `<b>Дней:</b> <code>${days}</code>\n` +
               `<b>Общая сумма:</b> <code>${totalCost.toLocaleString('ru-RU')}$</code>`,
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
               [Markup.button.callback('Подтвердить', 'confirm')],
               [Markup.button.callback('Отмена', 'cancel')],
            ]).reply_markup,
         });

         return ctx.wizard.next();
      } catch (err) {
         console.error('Ошибка в шаге 5 BUY_RANK_SCENE:', err.message);
         await ctx.reply('Произошла ошибка. Попробуйте позже.');
         return ctx.scene.leave();
      }
   },
   // Шаг 6: Обработка подтверждения и отправка администратору
   async (ctx) => {
      try {
         if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;

            if (data === 'cancel') {
               await ctx.answerCbQuery();
               try {
                  await ctx.editMessageReplyMarkup({ reply_markup: null });
               } catch (err) {
                  console.error('Ошибка при удалении клавиатуры (cancel):', err.message);
               }
               await ctx.reply('Покупка ранга отменена.');
               return ctx.scene.leave();
            }

            if (data === 'confirm') {
               await ctx.answerCbQuery();
               try {
                  await ctx.editMessageReplyMarkup({ reply_markup: null });
               } catch (err) {
                  console.error('Ошибка при удалении клавиатуры (confirm):', err.message);
               }

               const { nickname, fullRankName, days, price, totalCost, photoId } = ctx.wizard.state;

               await ctx.telegram.sendPhoto(-1002350890296, photoId, {
                  caption:
                     `Заявка на покупку ранга от @${ctx.from.username || 'неизвестного'}:\n\n` +
                     `<b>Никнейм:</b> <code>${nickname}</code>\n` +
                     `<b>Ранг:</b> <code>${fullRankName}</code>\n` +
                     `<b>Дней:</b> <code>${days}</code>\n` +
                     `<b>Цена за день:</b> <code>${price.toLocaleString('ru-RU')}$</code>\n` +
                     `<b>Сумма:</b> <code>${totalCost.toLocaleString('ru-RU')}$</code>`,
                  parse_mode: 'HTML',
                  message_thread_id: 24,
                  reply_markup: Markup.inlineKeyboard([
                     [
                        Markup.button.callback('✅ Одобрить', `approve_${ctx.from.id}`),
                        Markup.button.callback('❌ Отказать', `reject_${ctx.from.id}`),
                     ],
                     [Markup.button.callback('🚫 Заблокировать', `block_${ctx.from.id}`)]
                  ]).reply_markup,
               });

               await ctx.reply('Ваша заявка на покупку ранга отправлена на рассмотрение!');
               return ctx.scene.leave();
            }

            await ctx.answerCbQuery();
            await ctx.reply('Пожалуйста, выберите "Подтвердить" или "Отмена".');
            return;
         }

         await ctx.reply('Пожалуйста, выберите "Подтвердить" или "Отмена".');
         return;
      } catch (err) {
         console.error('Ошибка в шаге 6 BUY_RANK_SCENE:', err.message);
         await ctx.reply('Произошла ошибка. Попробуйте позже.');
         return ctx.scene.leave();
      }
   }
);

export const buyRank = async (ctx) => {
   try {
      // Проверка на наличие в черном списке
      const blacklistData = await readFile('./blacklist.json', 'utf8').catch(() => '[]');
      const blacklist = JSON.parse(blacklistData);
      if (blacklist.includes(ctx.from.id)) {
         await ctx.reply('Вы находитесь в черном списке и не можете отправлять заявки.');
         return;
      }
      await ctx.scene.enter('BUY_RANK_SCENE');
   } catch (err) {
      console.error('Ошибка входа в сцену:', err);
      await ctx.reply('Произошла ошибка при запуске процесса покупки. Попробуйте позже.');
   }
};