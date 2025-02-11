const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// Discordクライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // サーバー関連のイベント
    GatewayIntentBits.GuildMessages,     // メッセージ関連のイベント
    GatewayIntentBits.MessageContent,    // メッセージ内容の取得
  ]
});

// 環境変数から設定を読み込み
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID;
const ALLOWED_USERNAME = process.env.ALLOWED_USERNAME;

// メッセージをコマンドとメッセージに分解する関数
const parseMessage = (content) => {
  // メンション部分を削除してから処理
  const cleanContent = content.replace(/^<@.+>\s*/g, '').trim();
  
  // 最初のスペースの位置を見つける
  const firstSpaceIndex = cleanContent.indexOf(' ');
  
  // スペースが見つかった場合はコマンドとメッセージに分割
  if (firstSpaceIndex !== -1) {
    return {
      command: cleanContent.slice(0, firstSpaceIndex),
      content: cleanContent.slice(firstSpaceIndex + 1).trim()
    };
  }
  
  // helpの場合は特別処理
  if (cleanContent.toLowerCase() === 'help') {
    return {
      command: 'help',
      content: ''
    };
  }
  
  // それ以外の場合は全体をmessageコマンドとして扱う
  return {
    command: 'message',
    content: cleanContent
  };
};

// メッセージ受信時の処理
client.on('messageCreate', async message => {
  // 以下の場合は処理をスキップ:
  // 1. ボットからのメッセージ
  if (message.author.bot) return;
  // 2. 指定されたチャンネル以外
  // if (message.channelId !== ALLOWED_CHANNEL_ID) return;
  // 3. 特定のユーザー以外
  // if (message.author.username !== ALLOWED_USERNAME) return;

  // メッセージがボットへのメンションまたはリプライかチェック
  const isMention = message.mentions.has(client.user.id);
  const isReplyToMe = message.reference && (await message.fetchReference()).author.id === client.user.id;
  if (!isMention && !isReplyToMe) return;

  // メッセージをパース
  const { command, content } = parseMessage(message.content);

  try {
    // n8nのWebhookにメッセージを送信
    const response = await axios.post(WEBHOOK_URL, {
      content: content,
      command: command,  // コマンドがある場合のみ設定される
      author: message.author.username,
      channelId: message.channelId,
      messageId: message.id,
      replyMessageId: message.id
    });

    // Webhookからの応答があれば、それをDiscordに返信
    if (response.data?.output) {
      await message.reply(response.data.output);
    }
  } catch (error) {
    // エラー発生時はログを出力し、ユーザーにも通知
    console.error('Webhook送信エラー:', error);
    await message.reply('Webhook送信エラーが発生しました。');
  }
});

// Discordボットを起動
client.login(process.env.DISCORD_TOKEN);