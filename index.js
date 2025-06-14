import { Telegraf, Markup, Scenes, session } from 'telegraf';
import 'dotenv/config';
import { freeRanks } from './modules/freeranks.js';
import { ranks } from './modules/ranks.js';
import { buyRank, buyRankScene } from './modules/buyrank.js';
import { setupBuyRankHandlers } from './modules/buyrankHandlers.js';
import { salaries } from './modules/salaries.js';

const Bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware
Bot.use(session());
const stage = new Scenes.Stage([buyRankScene]);
Bot.use(stage.middleware());

// Константы
const pendingReasons = new Map();

// Обработчик команды /start
Bot.start(async (ctx) => {
   // Изменение: Проверяем, находится ли пользователь в сцене
   if (ctx.scene.current) {
      await ctx.reply(
         'Вы сейчас в процессе покупки ранга. Завершите его или используйте /cancel.',
         Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
      );
      return;
   }

   if (ctx.chat.id != process.env.GROUP_ID) {
      ctx.replyWithHTML(
         `Привет, <b>${ctx.from.first_name} ${ctx.from.last_name || ''}</b>`,
         Markup.keyboard([
            ['💎 Купить ранг', '🎮 Discord', '💰 Зарплаты'],
            ['🔰 Свободные ранги', '🏷 Цены на ранги']
         ]).resize(true)
      );
   } else {
      ctx.reply('Для использования бота перейдите в @jfmc_robot');
   }
});

// Добавлено: Обработчик команды /cancel
Bot.command('cancel', async (ctx) => {
   if (ctx.scene.current) {
      await ctx.reply('Процесс покупки ранга отменен.');
      await ctx.scene.leave();
   } else {
      await ctx.reply('Вы не находитесь в процессе покупки.');
   }
});

// /myid
Bot.command('myid', async (ctx) => {
   await ctx.reply(String(ctx.chat.id));
});

// Меню + обработка причин
Bot.on('text', async (ctx, next) => {
   // Изменение: Проверяем, находится ли пользователь в сцене
   if (ctx.scene.current) {
      await ctx.reply(
         'Вы сейчас в процессе покупки ранга. Завершите его или используйте /cancel.',
         Markup.inlineKeyboard([Markup.button.callback('Отмена', 'cancel')])
      );
      return;
   }

   const text = ctx.message.text;

   // Главное меню
   switch (text) {
      case '🔰 Свободные ранги':
         await freeRanks(Bot, ctx.chat.id);
         break;
      case '🏷 Цены на ранги':
         await ranks(Bot, ctx.chat.id);
         break;
      case '💎 Купить ранг':
         await buyRank(ctx);
         break;
      case '🎮 Discord':
         await ctx.reply('Discord Больницы: https://discord.gg/8xs4Z9YDgs');
         break;
      case '💰 Зарплаты':
         await salaries(Bot, ctx.chat.id);
         break;
      default:
         return next();
   }
});

setupBuyRankHandlers(Bot, pendingReasons);

// Запуск
Bot.launch().then(console.log('Бот запущен'));

// Обработка ошибок
Bot.catch((err, ctx) => {
   console.error('Ошибка в боте:', err);
   ctx.reply?.('Произошла ошибка. Попробуйте позже.');
});