window.HOOPLOOP_CASH_GRAB_DATA = (() => {
  const p = (id, name, price, pos, archetype, skills, era) => ({ id, name, price, pos, archetype, era, ...skills });
  const current = [
    p('sga','Shai Gilgeous-Alexander',5,'G','Two-way scoring engine',{scoring:98,shooting:88,playmaking:91,perimeterDefense:89,rimDefense:45,rebounding:58,finishing:97,athleticism:90,offBall:85,versatility:92,usage:96},'current'),
    p('jokic','Nikola Jokić',5,'C','Point center',{scoring:94,shooting:87,playmaking:99,perimeterDefense:55,rimDefense:65,rebounding:94,finishing:96,athleticism:60,offBall:93,versatility:97,usage:93},'current'),
    p('luka','Luka Dončić',5,'G','Heliocentric creator',{scoring:98,shooting:90,playmaking:98,perimeterDefense:58,rimDefense:38,rebounding:82,finishing:95,athleticism:76,offBall:73,versatility:91,usage:99},'current'),
    p('wemby','Victor Wembanyama',5,'B','Two-way unicorn',{scoring:93,shooting:86,playmaking:78,perimeterDefense:85,rimDefense:99,rebounding:94,finishing:97,athleticism:91,offBall:92,versatility:99,usage:88},'current'),
    p('giannis','Giannis Antetokounmpo',5,'F','Transition force',{scoring:97,shooting:64,playmaking:84,perimeterDefense:88,rimDefense:91,rebounding:94,finishing:99,athleticism:99,offBall:90,versatility:95,usage:96},'current'),

    p('ant','Anthony Edwards',4,'G','Power scoring guard',{scoring:94,shooting:88,playmaking:82,perimeterDefense:82,rimDefense:45,rebounding:66,finishing:94,athleticism:98,offBall:84,versatility:88,usage:93},'current'),
    p('cade','Cade Cunningham',4,'G','Big lead guard',{scoring:91,shooting:84,playmaking:94,perimeterDefense:74,rimDefense:47,rebounding:72,finishing:88,athleticism:82,offBall:79,versatility:89,usage:94},'current'),
    p('brunson','Jalen Brunson',4,'G','Half-court creator',{scoring:93,shooting:90,playmaking:90,perimeterDefense:64,rimDefense:25,rebounding:47,finishing:90,athleticism:76,offBall:88,versatility:83,usage:94},'current'),
    p('mitchell','Donovan Mitchell',4,'G','Three-level scorer',{scoring:94,shooting:91,playmaking:84,perimeterDefense:76,rimDefense:35,rebounding:52,finishing:91,athleticism:94,offBall:86,versatility:86,usage:93},'current'),
    p('jaylen-brown','Jaylen Brown',4,'F','Two-way slasher',{scoring:91,shooting:84,playmaking:74,perimeterDefense:89,rimDefense:59,rebounding:69,finishing:94,athleticism:96,offBall:88,versatility:91,usage:88},'current'),

    p('durant-current','Kevin Durant',3,'F','Elite shooting forward',{scoring:94,shooting:97,playmaking:82,perimeterDefense:74,rimDefense:65,rebounding:69,finishing:91,athleticism:78,offBall:96,versatility:90,usage:90},'current'),
    p('maxey','Tyrese Maxey',3,'G','Speed scoring guard',{scoring:91,shooting:91,playmaking:84,perimeterDefense:70,rimDefense:24,rebounding:45,finishing:88,athleticism:96,offBall:89,versatility:83,usage:91},'current'),
    p('chet','Chet Holmgren',3,'B','Stretch rim protector',{scoring:84,shooting:89,playmaking:68,perimeterDefense:78,rimDefense:96,rebounding:85,finishing:91,athleticism:84,offBall:93,versatility:93,usage:76},'current'),
    p('jalen-johnson','Jalen Johnson',3,'F','Point forward',{scoring:88,shooting:80,playmaking:86,perimeterDefense:78,rimDefense:70,rebounding:91,finishing:93,athleticism:96,offBall:84,versatility:93,usage:86},'current'),
    p('jamal-murray','Jamal Murray',3,'G','Pick-and-roll scorer',{scoring:90,shooting:93,playmaking:87,perimeterDefense:66,rimDefense:29,rebounding:48,finishing:84,athleticism:79,offBall:91,versatility:83,usage:88},'current'),

    p('bam','Bam Adebayo',2,'B','Switch big',{scoring:81,shooting:72,playmaking:77,perimeterDefense:94,rimDefense:91,rebounding:89,finishing:89,athleticism:90,offBall:86,versatility:94,usage:73},'current'),
    p('mobley','Evan Mobley',2,'B','Mobile defensive big',{scoring:82,shooting:76,playmaking:70,perimeterDefense:90,rimDefense:97,rebounding:90,finishing:91,athleticism:91,offBall:87,versatility:94,usage:72},'current'),
    p('booker','Devin Booker',2,'G','Scoring connector',{scoring:91,shooting:94,playmaking:86,perimeterDefense:68,rimDefense:28,rebounding:52,finishing:87,athleticism:81,offBall:94,versatility:84,usage:89},'current'),
    p('flagg','Cooper Flagg',2,'F','Two-way connector',{scoring:85,shooting:81,playmaking:80,perimeterDefense:88,rimDefense:83,rebounding:84,finishing:90,athleticism:93,offBall:87,versatility:94,usage:80},'current'),
    p('duren','Jalen Duren',2,'B','Interior force',{scoring:78,shooting:45,playmaking:62,perimeterDefense:68,rimDefense:86,rebounding:95,finishing:96,athleticism:95,offBall:90,versatility:78,usage:68},'current'),

    p('derrick-white','Derrick White',1,'G','Two-way connector',{scoring:77,shooting:91,playmaking:79,perimeterDefense:93,rimDefense:72,rebounding:54,finishing:72,athleticism:78,offBall:96,versatility:92,usage:58},'current'),
    p('caruso','Alex Caruso',1,'G','Defensive glue',{scoring:64,shooting:83,playmaking:72,perimeterDefense:99,rimDefense:68,rebounding:50,finishing:67,athleticism:82,offBall:90,versatility:89,usage:42},'current'),
    p('herb','Herb Jones',1,'F','Wing stopper',{scoring:67,shooting:80,playmaking:65,perimeterDefense:99,rimDefense:82,rebounding:58,finishing:74,athleticism:88,offBall:88,versatility:91,usage:45},'current'),
    p('turner','Myles Turner',1,'B','Stretch rim protector',{scoring:75,shooting:88,playmaking:49,perimeterDefense:65,rimDefense:93,rebounding:78,finishing:84,athleticism:78,offBall:91,versatility:84,usage:55},'current'),
    p('josh-hart','Josh Hart',1,'F','Rebounding utility wing',{scoring:72,shooting:75,playmaking:78,perimeterDefense:85,rimDefense:55,rebounding:90,finishing:80,athleticism:86,offBall:91,versatility:90,usage:51},'current')
  ];

  const allTime = [
    p('jordan','Michael Jordan',5,'G','Two-way scoring apex',{scoring:99,shooting:90,playmaking:88,perimeterDefense:98,rimDefense:62,rebounding:75,finishing:99,athleticism:99,offBall:96,versatility:98,usage:97},'alltime'),
    p('lebron','LeBron James',5,'F','Complete engine',{scoring:98,shooting:85,playmaking:98,perimeterDefense:94,rimDefense:86,rebounding:88,finishing:99,athleticism:99,offBall:90,versatility:99,usage:96},'alltime'),
    p('kareem','Kareem Abdul-Jabbar',5,'B','Interior scoring anchor',{scoring:99,shooting:76,playmaking:74,perimeterDefense:67,rimDefense:97,rebounding:96,finishing:99,athleticism:88,offBall:95,versatility:93,usage:94},'alltime'),
    p('magic','Magic Johnson',5,'G','Oversized maestro',{scoring:88,shooting:73,playmaking:99,perimeterDefense:77,rimDefense:52,rebounding:88,finishing:94,athleticism:91,offBall:91,versatility:97,usage:91},'alltime'),
    p('bird','Larry Bird',5,'F','Complete skill forward',{scoring:96,shooting:98,playmaking:95,perimeterDefense:82,rimDefense:53,rebounding:91,finishing:88,athleticism:72,offBall:99,versatility:98,usage:92},'alltime'),

    p('kobe','Kobe Bryant',4,'G','Two-way shot creator',{scoring:97,shooting:92,playmaking:85,perimeterDefense:95,rimDefense:50,rebounding:68,finishing:96,athleticism:96,offBall:94,versatility:94,usage:97},'alltime'),
    p('duncan','Tim Duncan',4,'B','Fundamental two-way anchor',{scoring:91,shooting:74,playmaking:80,perimeterDefense:80,rimDefense:99,rebounding:98,finishing:96,athleticism:80,offBall:94,versatility:96,usage:84},'alltime'),
    p('shaq','Shaquille O’Neal',4,'B','Interior wrecking ball',{scoring:99,shooting:35,playmaking:67,perimeterDefense:56,rimDefense:91,rebounding:97,finishing:99,athleticism:98,offBall:93,versatility:88,usage:98},'alltime'),
    p('curry','Stephen Curry',4,'G','Gravity playmaker',{scoring:96,shooting:99,playmaking:94,perimeterDefense:70,rimDefense:25,rebounding:55,finishing:90,athleticism:85,offBall:99,versatility:92,usage:94},'alltime'),
    p('hakeem','Hakeem Olajuwon',4,'B','Two-way post superstar',{scoring:94,shooting:75,playmaking:69,perimeterDefense:83,rimDefense:99,rebounding:97,finishing:98,athleticism:95,offBall:90,versatility:97,usage:90},'alltime'),

    p('kg','Kevin Garnett',3,'F','Switchable two-way big',{scoring:88,shooting:79,playmaking:84,perimeterDefense:94,rimDefense:97,rebounding:98,finishing:91,athleticism:96,offBall:91,versatility:99,usage:83},'alltime'),
    p('wade','Dwyane Wade',3,'G','Slashing two-way creator',{scoring:95,shooting:72,playmaking:89,perimeterDefense:92,rimDefense:58,rebounding:66,finishing:98,athleticism:98,offBall:87,versatility:92,usage:94},'alltime'),
    p('dirk','Dirk Nowitzki',3,'F','Stretch scoring big',{scoring:95,shooting:98,playmaking:67,perimeterDefense:57,rimDefense:56,rebounding:86,finishing:89,athleticism:67,offBall:97,versatility:87,usage:91},'alltime'),
    p('oscar','Oscar Robertson',3,'G','All-around lead guard',{scoring:93,shooting:81,playmaking:97,perimeterDefense:81,rimDefense:42,rebounding:90,finishing:94,athleticism:91,offBall:88,versatility:96,usage:93},'alltime'),
    p('dr-j','Julius Erving',3,'F','Athletic scoring wing',{scoring:94,shooting:74,playmaking:79,perimeterDefense:86,rimDefense:65,rebounding:82,finishing:99,athleticism:99,offBall:90,versatility:93,usage:91},'alltime'),

    p('pippen','Scottie Pippen',2,'F','Two-way point forward',{scoring:82,shooting:77,playmaking:89,perimeterDefense:99,rimDefense:75,rebounding:79,finishing:88,athleticism:95,offBall:91,versatility:99,usage:72},'alltime'),
    p('admiral','David Robinson',2,'B','Athletic two-way center',{scoring:91,shooting:69,playmaking:65,perimeterDefense:76,rimDefense:99,rebounding:98,finishing:98,athleticism:99,offBall:91,versatility:95,usage:84},'alltime'),
    p('nash','Steve Nash',2,'G','Efficiency playmaker',{scoring:80,shooting:99,playmaking:99,perimeterDefense:55,rimDefense:20,rebounding:45,finishing:82,athleticism:79,offBall:97,versatility:89,usage:75},'alltime'),
    p('barkley','Charles Barkley',2,'F','Undersized power force',{scoring:93,shooting:69,playmaking:80,perimeterDefense:74,rimDefense:65,rebounding:99,finishing:98,athleticism:98,offBall:89,versatility:94,usage:88},'alltime'),
    p('stockton','John Stockton',2,'G','Pure floor general',{scoring:76,shooting:91,playmaking:99,perimeterDefense:92,rimDefense:21,rebounding:40,finishing:71,athleticism:76,offBall:94,versatility:89,usage:69},'alltime'),

    p('rodman','Dennis Rodman',1,'F','Defense and rebounding specialist',{scoring:35,shooting:25,playmaking:55,perimeterDefense:98,rimDefense:92,rebounding:99,finishing:72,athleticism:96,offBall:95,versatility:87,usage:18},'alltime'),
    p('reggie','Reggie Miller',1,'G','Movement shooter',{scoring:84,shooting:99,playmaking:67,perimeterDefense:67,rimDefense:20,rebounding:40,finishing:76,athleticism:78,offBall:99,versatility:82,usage:67},'alltime'),
    p('ray-allen','Ray Allen',1,'G','Elite spacer',{scoring:86,shooting:99,playmaking:70,perimeterDefense:76,rimDefense:22,rebounding:47,finishing:82,athleticism:87,offBall:99,versatility:86,usage:70},'alltime'),
    p('mutombo','Dikembe Mutombo',1,'B','Rim protection specialist',{scoring:48,shooting:28,playmaking:30,perimeterDefense:56,rimDefense:99,rebounding:97,finishing:76,athleticism:82,offBall:84,versatility:75,usage:25},'alltime'),
    p('ben-wallace','Ben Wallace',1,'B','Defensive anchor',{scoring:38,shooting:22,playmaking:41,perimeterDefense:72,rimDefense:99,rebounding:99,finishing:72,athleticism:94,offBall:86,versatility:82,usage:20},'alltime')
  ];

  return {
    version: '1.0.0',
    current,
    allTime,
    modes: {
      current: { label: 'Current Players', players: current },
      alltime: { label: 'All-Time Players', players: allTime }
    }
  };
})();
