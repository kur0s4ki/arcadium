const WebSocket = require('ws');
const { NFC } = require('nfc-pcsc');
let events = require('events');
const arduino = require('./arduino.js');
const axios = require('axios');

let cardUID = '';
let RS232_READER = 'RS232';
let word = '';
let challenge = '';
const OUT_ON = '1';
const OUT_OFF = '0';
let interpret = false;
let wsClient = false;
let badgeLock = false;
let teamId = 0;
let cellId = 39;
let teamName = '';
let gameLevel = '';
let codeWord = '';
let totalNumberOfKeys = 0;
let formula = 0;
let winLoss_timeout = 15000;
let resetTime = 600000;
let badgeResetTime = 5000;
let bipTime = 100;
let cellTimeout;
let ValEvent4;
let ValEvent5;
let ValEvent6;
let badgeLockTimeout;

// 🔵 Fountain state tracking
let fountainActive = false;

// 🌐 API Configuration
const apiBaseUrl = 'http://192.168.88.150:8000/api';
const smeetzBaseUrl =
  'https://api.smeetz.com/org/prod/en/fort-boyard/group/19581';
const apiKey = 'd_YbioLRNdW6TeymRyB1ApEY_YAzasHyDWScwi-_MxY';

// 🛡️ Admin Credentials
let adminBadges = [
  '5A3737F0',
  'AAFDDDEE',
  '9AE03AF0',
  '0ABFDAEE',
  '9AA32FF0',
  '55A2FEFE',
  '5573EDFF',
  'C78C1C09',
  '152808FF',
  '25E6E1FF',
  '8595E1FF',
  '55DFE3FF',
  'D5F5F2FF',
];
let adminPasses = [
  '0690A650',
  '342CB922',
  '3425AF22',
  'A4D2B922',
  '57653A09',
  '0690A650',
  'B74C1B09',
  '2436AA22',
  '04271123',
  '732B0C03',
  '54749F22',
  '0000000000000000', // Added zeroed UID
];

// 🎮 Game Configuration
let keys = [
  ['C', 'B', 'G', 'F', 'J', 'U'],
  ['Q', 'T', 'E', 'L', 'M', 'I'],
  ['I', 'A', 'H', 'O', 'P', 'S'],
  ['F', 'V', 'S', 'N', 'D', 'R'],
  ['X', 'C', 'R', 'U', 'E', 'L'],
  ['E', 'N', 'E', 'A', 'P', 'T'],
];
let startDate = new Date().toISOString().split('T')[0];
let keyboard = [0, 0, 0, 0, 0, 0];

// 🌐 WebSocket Setup
const wss = new WebSocket.Server({ port: 8000 });
const wss_pc_games = new WebSocket.Server({ port: 8005 });
const nfc = new NFC();
let event = new events.EventEmitter();

// 🧠 Admin Session Tracking
let isAdminSession = false; // NEW FLAG

// 💡 Score Calculation
const calculateWeightedScore = (
  gameLevel,
  formula,
  totalNumberOfKeys,
  boyards,
) => {
  let difficulty = 0;
  switch (gameLevel) {
    case 'MEDIUM':
      difficulty = 0.1;
      break;
    case 'HARD':
      difficulty = 0.2;
      break;
  }
  switch (formula) {
    case 1:
      if (totalNumberOfKeys > 3) {
        boyards += parseInt(
          (boyards * (totalNumberOfKeys - 3) * 0.1).toString(),
        );
        boyards += parseInt((boyards * difficulty).toString());
      }
      break;
    case 2:
      if (totalNumberOfKeys > 7) {
        boyards += parseInt(
          (boyards * (totalNumberOfKeys - 7) * 0.1).toString(),
        );
        boyards += parseInt((boyards * difficulty).toString());
      }
      break;
  }
  return boyards;
};

// 📤 API Endpoints
const createScore = async (teamId, cellId, codeWord, boyards) => {
  const url = `${apiBaseUrl}/createScore/team/${teamId}/cell/${cellId}/scoreStatus/WON/score/${boyards}/word/${codeWord}`;
  try {
    const response = await axios.get(url);
    console.log(
      `[${arduino.getCurrentTime()}]   [API] RESPONSE CODE :`,
      response.data.code,
    );
    return response;
  } catch (error) {
    console.log(
      `[${arduino.getCurrentTime()}]   AN ERROR OCCURED :`,
      error.message,
    );
  }
};

// 🔐 Badge Processing
const processBadge = (readerName, card) => {
  if (
    (readerName.includes('PICC') || readerName.includes('RS232')) &&
    badgeLock == false
  ) {
    cardUID = card.toString().toUpperCase();

    console.log(
      `==================================================================`,
    );

    if (!adminBadges.includes(cardUID) && wsClient) {
      if (cardUID != '') {
        console.log(`[BADGE]  DATE : ${arduino.getCurrentDateTime()}`);

        // 🔐 Set admin session flag
        if (adminPasses.includes(cardUID) || adminBadges.includes(cardUID)) {
          isAdminSession = true;

          if (adminPasses.includes(cardUID)) {
            console.log(
              `[${arduino.getCurrentTime()}]   ADMIN PASS DETECTED (NOT ADMIN BADGE).`,
            );
            cardUID = '0000000000000000';
          } else {
            console.log(
              `[${arduino.getCurrentTime()}]   ADMIN BADGE DETECTED.`,
            );
          }
        } else {
          console.log(
            `[${arduino.getCurrentTime()}]   TEAM BADGE DETECTED. ID: ${cardUID}`,
          );
          isAdminSession = false;
        }

        badgeLock = true;
        arduino.emitter.emit('badgeIn');

        badgeLockTimeout = setTimeout(() => {
          console.log(
            `[${arduino.getCurrentTime()}]   BADGE TIMEOUT , NO ANSWER RECEIVED, BADGE READER UNLOCKED.`,
          );
          badgeLock = false;
        }, badgeResetTime);
      } else {
        console.log(`[${arduino.getCurrentTime()}]   INVALID CARD.`);
        badgeLock = false;
      }
    } else if (adminBadges.includes(cardUID)) {
      console.log(`[${arduino.getCurrentTime()}]   ADMIN BADGE DETECTED.`);
      isAdminSession = true; // Ensure flag is set
      arduino.openDoor();
      badgeLock = false;
    } else {
      console.log(
        `[${arduino.getCurrentTime()}]   CELL OCCUPIED OR NO CLIENT CONNECTED.`,
      );
      badgeLock = false;
    }
  } else {
    console.log(
      `[${arduino.getCurrentTime()}]   CELL OCCUPIED OR READER LOCKED.`,
    );
  }
};

// 🔄 Event Handlers
arduino.emitter.on('EventInput', (numEvent, input) => {
  if (numEvent == '4') ValEvent4 = input;
  if (numEvent == '5') ValEvent5 = input;
  if (numEvent == '6') {
    ValEvent6 = input;
    keyboard[0] = ValEvent4 / 256;
    keyboard[1] = ValEvent4 % 256;
    keyboard[2] = ValEvent5 / 256;
    keyboard[3] = ValEvent5 % 256;
    keyboard[4] = ValEvent6 / 256;
    keyboard[5] = ValEvent6 % 256;
    word = '';
    // Word Construction
    for (let i = 0; i < 6; i++) {
      let rot = 1;
      for (let j = 0; j < 6; j++) {
        if ((rot & keyboard[i]) > 0) {
          word = word + keys[i][j];
        }
        rot = rot * 2;
      }
    }
    challenge = word;
    arduino.emitter.emit('shareChallengeWord');
  }

  if (numEvent == '30') {
    let weightedScore = calculateWeightedScore(
      gameLevel,
      formula,
      totalNumberOfKeys,
      input,
    );
    console.log(`[${arduino.getCurrentTime()}]   SCORE : ${weightedScore}`);

    // ✅ Skip score creation for admin sessions
    if (!isAdminSession) {
      (async () => {
        try {
          const result = await createScore(
            teamId,
            cellId,
            codeWord,
            weightedScore,
          );
          arduino.emitter.emit('resetAnimations');

          if (result?.data?.code === 200) {
            getTeamIdByNfcTagAndStartDate(startDate, cardUID)
              .then((_id) => {
                if (_id !== null) {
                  return patchTeam(_id, weightedScore);
                }
              })
              .then(() => {
                console.log(`[${arduino.getCurrentTime()}]   UPDATE FINISHED.`);
              })
              .catch((error) => {
                console.log(
                  `[${arduino.getCurrentTime()}]   SMEETZ : AN ERROR OCCURRED :`,
                  error.message,
                );
              });
          }
        } catch (error) {
          console.log(
            `[${arduino.getCurrentTime()}]   API SCORE : AN ERROR OCCURRED :`,
            error.message,
          );
        }
      })();
    } else {
      console.log(
        `[${arduino.getCurrentTime()}]   ADMIN SESSION DETECTED. SKIPPING SCORE CREATION AND SMEETZ UPDATE.`,
      );
      arduino.emitter.emit('resetAnimations');
      isAdminSession = false; // Reset for next session
    }
  }

  if (numEvent == '31') {
    console.log(`[${arduino.getCurrentTime()}]   RESET EVENT.`);
    handleCase('reset');
  }
});
arduino.emitter.on('tresorInput', (arg) => {
  challenge = arg;
  arduino.emitter.emit('shareChallengeWord');
  challenge = '';
});

wss.on('connection', function connection(ws) {
  if (!wsClient)
    console.log(`[${arduino.getCurrentTime()}]   WS PRIMARY CLIENT CONNECTED.`);
  wsClient = true;

  arduino.emitter.on('badgeIn', () => {
    // Pad the UID only for the message
    const paddedCardUID = cardUID.padStart(16, '0');
    const messageSent = {
      action: 'badge_in',
      cardUID: paddedCardUID,
    };
    ws.send(JSON.stringify(messageSent));
  });

  arduino.emitter.on('shareChallengeWord', () => {
    const messageSent = {
      action: 'challenge',
      data: challenge,
    };
    ws.send(JSON.stringify(messageSent));
  });

  arduino.emitter.on('resetAnimations', () => {
    const messageSent = {
      action: 'reset_animations',
    };
    ws.send(JSON.stringify(messageSent));
  });

  ws.on('message', (messageReceived) => {
    messageReceived = messageReceived.toString();

    if (messageReceived.search('game_status') !== -1) {
      const winStatus = JSON.parse(JSON.parse(messageReceived)).data;
      if (winStatus === 'win') {
        console.log(`[${arduino.getCurrentTime()}]   STARTING FOUNTAIN`);
        arduino.set_output(arduino.OUTPUT_FOUNTAIN, arduino.OUT_ON);
        fountainActive = true;
      } else {
        handleCase('loss');
      }
    }

    if (messageReceived.search('end_fountain') !== -1) {
      if (fountainActive) {
        console.log(
          `[${arduino.getCurrentTime()}]   END TIME FOUNTAIN RECEIVED`,
        );
        arduino.set_output(arduino.OUTPUT_FOUNTAIN, arduino.OUT_OFF);
        fountainActive = false;

        setTimeout(() => {
          console.log(`[${arduino.getCurrentTime()}]   TURN OFF CELL LIGHTS`);
          arduino.powerOffCell();
        }, 5000);
      } else {
        console.log(
          `[${arduino.getCurrentTime()}]   FOUNTAIN NOT ACTIVE. IGNORED END COMMAND.`,
        );
      }
    }

    if (messageReceived.search('open') !== -1) {
      teamId = JSON.parse(JSON.parse(messageReceived)).teamId;
      teamName = JSON.parse(JSON.parse(messageReceived)).teamName;
      gameLevel = JSON.parse(JSON.parse(messageReceived)).gameLevel;
      codeWord = JSON.parse(JSON.parse(messageReceived)).codeWord;
      totalNumberOfKeys = JSON.parse(
        JSON.parse(messageReceived),
      ).totalNumberOfKeys;
      formula = JSON.parse(JSON.parse(messageReceived)).formula;
      startDate = new Date().toISOString().split('T')[0];
      arduino.openDoor(teamName);
      arduino.turnOffGreenIndicator();
      arduino.powerOnCell();
      clearTimeout(badgeLockTimeout);
      clearTimeout(cellTimeout);
      cellTimeout = setTimeout(() => {
        console.log(
          `[${arduino.getCurrentTime()}]   CELL TIMEOUT TRIGGERED , RESETTING ALL PARAMETRES.`,
        );
        arduino.setBarled(0);
        arduino.powerOffCell();
        arduino.greenLightEffectOn();
        arduino.turnOnGreenIndicator();
        badgeLock = false;
        interpret = false;
      }, resetTime);
    }

    if (messageReceived.search('phase_finished') !== -1) {
      handleCase('phaseFinished');
    }

    if (messageReceived.search('go') !== -1) {
      arduino.set_output(24, OUT_ON);
    }

    if (messageReceived.search('exit') !== -1) {
      handleCase('loss');
    }

    if (messageReceived.search('badge_play_simulate') !== -1) {
      console.log(`[${arduino.getCurrentTime()}]   ADMIN PLAY DETECTED.`);
      cardUID = '0000000000000000';
      arduino.emitter.emit('badgeIn');
      badgeLock = true;
    }

    if (messageReceived.search('badge_real_simulate') !== -1) {
      cardUID = '123456';
      console.log(
        `[${arduino.getCurrentTime()}]   CARD ID : `,
        cardUID,
        ` LOCKING THE BADGE READER.`,
      );
      badgeLock = true;
      arduino.emitter.emit('badgeIn');
      badgeLockTimeout = setTimeout(() => {
        console.log(
          `[${arduino.getCurrentTime()}]   BADGE TIMEOUT , NO ANSWER RECEIVED, BADGE READER UNLOCKED.`,
        );
        badgeLock = false;
      }, badgeResetTime);
    }

    if (messageReceived.search('unauthorized_access') !== -1) {
      clearTimeout(badgeLockTimeout);
      badgeLock = false;
      let message = JSON.parse(JSON.parse(messageReceived));
      let counter = 0;
      let reason = '';

      switch (message.data) {
        case 1:
          reason = `PHASE FINISHED FOR ${message.teamName ?? 'THIS TEAM'}`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          counter = 0;
          Theinterval = setInterval(() => {
            switch (counter) {
              case 0:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
              case 1:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_ON,
                );
                break;
              case 2:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
              case 3:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_ON,
                );
                break;
            }
            if (counter === 3) {
              clearInterval(Theinterval);
            }
            counter++;
          }, bipTime);
          break;
        case 2:
          reason = `${
            message.teamName ?? 'THE TEAM'
          } HAS ALREADY PLAYED THIS GAME.`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          counter = 0;
          Theinterval = setInterval(() => {
            switch (counter) {
              case 0:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
              case 1:
                arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_ON);
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
              case 2:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
              case 3:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_ON,
                );
                break;
            }
            if (counter === 3) {
              clearInterval(Theinterval);
            }
            counter++;
          }, bipTime);
          break;
        case 3:
          reason = `${message.teamName ?? 'THIS TEAM'} IS BLOCKED`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          counter = 1;
          Theinterval = setInterval(() => {
            arduino.set_output(
              arduino.OUTPUT_LED_DOOR_RED,
              counter % 2 === 0 ? '0' : '1',
            );
            counter++;
            if (counter === 5) {
              clearInterval(Theinterval);
              arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_ON);
            }
          }, bipTime);
          break;
        case 4:
          reason = `UNKNOWN`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_OFF);
          counter = 0;
          Theinterval = setInterval(() => {
            switch (counter) {
              case 0:
                arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_ON);
                break;
              case 1:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_RED,
                  arduino.OUT_OFF,
                );
                break;
              case 2:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_ON,
                );
                break;
              case 3:
                arduino.set_output(
                  arduino.OUTPUT_LED_DOOR_GREEN,
                  arduino.OUT_OFF,
                );
                break;
            }
            if (counter === 4) {
              clearInterval(Theinterval);
              arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_ON);
            }
            counter++;
          }, bipTime);
          break;
        case 5:
          reason = `NO ANSWER FROM SERVER`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_OFF);
          setTimeout(() => {
            arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_ON);
          }, 5000);
          break;
        case 6:
          reason = `${
            message.teamName ?? 'THE TEAM'
          } MUST PLAY JUDGMENT, COUNCIL, OR TREASURE.`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_OFF);
          setTimeout(() => {
            arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_ON);
          }, 5000);
          break;
        case 7:
          reason = `INSUFFICIENT TIME FOR : ${
            message.teamName ?? 'THE TEAM'
          }. < 20 SEC LEFT.`;
          arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_OFF);
          arduino.set_output(arduino.OUTPUT_LED_DOOR_RED, arduino.OUT_OFF);
          setTimeout(() => {
            arduino.set_output(arduino.OUTPUT_LED_DOOR_GREEN, arduino.OUT_ON);
          }, 5000);
          break;
      }
      console.log(
        `[${arduino.getCurrentTime()}]   ACCESS DENIED :`,
        reason,
        `. BADGE READER UNLOCKED.`,
      );
    }
  });

  ws.on('close', () => {
    console.log(
      `[${arduino.getCurrentTime()}]   WS PRIMARY CLIENT DISCONNECTED.`,
    );
    wsClient = false;
    badgeLock = false;
  });
});

arduino.emitter.on('Rs232Badge', (data) => {
  processBadge(RS232_READER, data);
});

nfc.on('reader', (reader) => {
  console.log(`[${arduino.getCurrentTime()}]   ${reader.name}.`);
  reader.on('card', (card) => {
    processBadge(reader.name, card.uid);
  });
  reader.on('error', (err) => {
    console.error(`[${arduino.getCurrentTime()}]   ERROR : `, err);
  });
  reader.on('end', () => {
    console.log(`[${arduino.getCurrentTime()}]   ${reader.name} DISCONNECTED.`);
  });
});

nfc.on('error', (err) => {
  console.error(`[${arduino.getCurrentTime()}]   ERROR : `, err);
});
