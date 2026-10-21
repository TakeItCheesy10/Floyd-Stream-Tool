// Character/art mapping reused from the user's Versari SF6 broadcast project.
const fighters = ['Ryu','Luke','Jamie','Chun-Li','Guile','Kimberly','Juri','Ken','Blanka','Dhalsim','E. Honda','Dee Jay','Manon','Marisa','JP','Zangief','Lily','Cammy','Rashid','A.K.I.','Ed','Akuma','M. Bison','Terry','Mai','Elena','Sagat','C. Viper','Alex','Ingrid','Yasmine'];
const characters = fighters.map((name, index) => ({ name, art: `/Resources/StreetFighter6/Characters/color_character${index + 1}.png` }));
module.exports = { characters };
