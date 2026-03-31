const fs = require('fs');

let file = fs.readFileSync('static/script.js', 'utf8');

file = file.replace(
    /activeBranch\[savedUserMsg\.id\] = parsed\.message_id;\s*renderChat\(\);\s*continue;/g,
    "activeBranch[savedUserMsg.id] = parsed.message_id;\n                                    \n                                    continue;"
);

file = file.replace(
    /activeBranch\[newMsgObj\.id\] = parsed\.message_id;\s*renderChat\(\);\s*continue;/g,
    "activeBranch[newMsgObj.id] = parsed.message_id;\n                                                    continue;"
);

fs.writeFileSync('static/script.js', file);
