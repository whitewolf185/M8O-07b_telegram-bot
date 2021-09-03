const fs = require('fs');
const TgBot = require('node-telegram-bot-api');
const readLine = require('readline-sync')
let token = '';

let options = {};

function write_to_log(text){
    let date = new Date;
    let data = '[ ' + date + ' ]\n' + text + '\n\n';
    fs.writeFileSync(__dirname + '/logfile.log', data, {
        flag: 'a+'
    });
}

function add_trusted_users(question){
    options.trustedUsers.push(question.who);
    fs.writeFileSync(__dirname + '/options.txt', JSON.stringify(options));
}

function create_queue(queueListening){
    let str = '';
    for (let i = 0; i < queueListening.queue.length; i++) {
        str += (i+1) + '. ' + queueListening.queue[i] + '\n';
    }

    return str;
}

let start = new Promise( ((resolve, reject) => {
    try {
        token = fs.readFileSync(__dirname + '/token.txt', "utf-8");
    }
    catch (e) {
        if (e.code === 'ENOENT'){
            token = readLine.question("Enter token...\n",{});
            fs.writeFileSync(__dirname + '/token.txt',token);
            resolve(token)
        }
        else{
            reject(e);
        }
    }

    try {
        let str_options = fs.readFileSync(__dirname + '/options.txt', "utf-8");
        options = JSON.parse(str_options);
    }
    catch (e){
        if(e.code === 'ENOENT'){
            console.log('options empty');
            write_to_log('options empty');
            options = {
                trustedUsers: []
            };
        }
    }


    resolve(token);
}))

start.then(
    token => {
        const bot = new TgBot(token, {
            polling: true
        })

        const commands = ["/newqueue", "/donequeue"];
        let question = {
            bool: false,
            who: 0,
            username: '',
            chat: 0
        };

        let queueListening = {
            bool: false,
            queue: [],
            str: '',
            count: 0,
            chat_id: 0
        };

        bot.onText(/\/newqueue/, (msg) => {
            console.log('im in queue');
            if (queueListening.bool){
                bot.sendMessage(msg.chat.id, "очередь уже запущена");
            }
            else if (options.trustedUsers.indexOf(msg.from.id) === -1){
                bot.sendMessage(msg.chat.id, "Ты не достоин");
            }
            else{
                console.log("im here");
                bot.sendMessage(msg.chat.id, "Начинаю очередь...\nПишите _/Я_, если хотите добавиться в очердь.",{
                    parse_mode: "Markdown"
                });
                queueListening.bool = true;
                queueListening.chat_id = msg.chat.id;

                write_to_log("User " + msg.from.username + ' started queue');
            }
        })

        bot.onText(/\/donequeue/, (msg) => {
            if(queueListening.bool){
                queueListening.str = create_queue(queueListening);
                bot.sendMessage(queueListening.chat_id, "*Вот такая наша очередь:*\n" + queueListening.str ,{
                    parse_mode: "Markdown"
                });
            }
            queueListening.bool = false;
        })

        bot.onText(/\/showqueue/, (msg) => {
            if(queueListening.bool){
                bot.sendMessage(queueListening.chat_id, "*Сейчас очередь такая:*\n" + queueListening.str ,{
                    parse_mode: "Markdown"
                });
            }
        })

        bot.onText(/\/07b_bot я достоин/, (msg) => {
            console.log('requested');
            bot.sendMessage(475513670, msg.from.username + " достоин?");
            question.bool = true;
            question.who = msg.from.id;
            question.username = msg.from.username;
            question.chat = msg.chat.id;
            write_to_log(msg.from.username + ' | id:' + msg.from.id + ' requested access to trusted Users');
        })


        bot.on('message', (msg) => {
            if(question.bool){
                if(msg.from.id === 475513670){
                    if(msg.text.toLowerCase() === '/07b_bot да') {
                        add_trusted_users(question);
                        bot.sendMessage(question.chat, "Добро пожаловать " + question.username);

                        write_to_log(question.username + ' | id:' + question.who + ' has got access to trusted Users');

                        question.bool = false;
                    }

                    else{
                        bot.sendMessage(question.chat, "Мне сказали ты не достоин");
                        question.bool = false;
                    }
                }
            }

            else if(queueListening){
                if(msg.text.toLowerCase() === '/я' && queueListening.queue.indexOf(msg.from.username) === -1){
                    console.log('added');
                    queueListening.count++;
                    queueListening.queue.push(msg.from.username);
                    bot.sendMessage(msg.chat.id, msg.from.username + ' добавлен ' + queueListening.count + '-м');
                }
            }

            console.log(msg);
        })



    }
)

    //something goes wrong
    .catch(e => {
        write_to_log('Something wrong with token');
    })