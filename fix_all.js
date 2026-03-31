const fs = require('fs');

let file = fs.readFileSync('static/script.js', 'utf8');

file = file.replace(
    /activeBranch\[msgIdInt\] = parsed\.message_id;\s*\/\/\s*Make sure it updates correctly the visual branch selector\s*renderChat\(\);\s*continue;/g,
    "activeBranch[msgIdInt] = parsed.message_id;\n                                    \n                                    continue;"
);

file = file.replace(
    /activeBranch\[parentId\] = parsed\.message_id;\s*\/\/\s*Re-render once more to ensure the branch navigator updates\s*renderChat\(\);\s*continue;/g,
    "activeBranch[parentId] = parsed.message_id;\n                                    \n                                    continue;"
);

fs.writeFileSync('static/script.js', file);
