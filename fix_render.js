const fs = require('fs');

let file = fs.readFileSync('static/script.js', 'utf8');

file = file.replace(
    /if \(!messageChildren\[msgIdInt\]\) messageChildren\[msgIdInt\] = \[\];\s*messageChildren\[msgIdInt\]\.push\(parsed\.message_id\);\s*activeBranch\[msgIdInt\] = parsed\.message_id;\s*\/\/\s*Make sure it updates correctly the visual branch selector\s*renderChat\(\);/g,
    "if (!messageChildren[msgIdInt]) messageChildren[msgIdInt] = [];\n                                    messageChildren[msgIdInt].push(parsed.message_id);\n                                    activeBranch[msgIdInt] = parsed.message_id;\n                                    \n                                    // Make sure it updates correctly the visual branch selector\n                                    renderChat();"
);

file = file.replace(
    /if \(!messageChildren\[parentId\]\) messageChildren\[parentId\] = \[\];\s*messageChildren\[parentId\]\.push\(parsed\.message_id\);\s*activeBranch\[parentId\] = parsed\.message_id;\s*\/\/\s*Re-render once more to ensure the branch navigator updates\s*renderChat\(\);/g,
    "if (!messageChildren[parentId]) messageChildren[parentId] = [];\n                                    messageChildren[parentId].push(parsed.message_id);\n                                    activeBranch[parentId] = parsed.message_id;\n                                    \n                                    // Re-render once more to ensure the branch navigator updates\n                                    renderChat();"
);

fs.writeFileSync('static/script.js', file);
