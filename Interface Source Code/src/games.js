const { characters } = require('./sf6-characters');
const { validateStreetFighter, validateSmash } = require('./state');
const games = [{
    id: 'smash-ultimate', name: 'Super Smash Bros. Ultimate',
    validate: validateSmash, layouts: { scoreboard: 'Smash Scoreboard.html', versus: 'Smash VS.html' }
}, {
    id: 'street-fighter-6', name: 'Street Fighter 6', characters,
    defaults: { p1Color: 'Blue', p2Color: 'Red', bestOf: 'Bo5', tournamentName: 'Floyd Esports' },
    validate: validateStreetFighter,
    layouts: { scoreboard: 'Street Fighter Scoreboard.html', versus: 'Street Fighter VS.html' }
}];
module.exports = { games };
