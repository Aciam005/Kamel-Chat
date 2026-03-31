const fs = require('fs');
let file = fs.readFileSync('static/script.js', 'utf8');
file = file.replace(/activeBranch\[parentId\] = parsed\.message_id;\s*continue;/g, "activeBranch[parentId] = parsed.message_id;\n                                    renderChat();\n                                    continue;");
file = file.replace(/activeBranch\[savedUserMsg\.id\] = parsed\.message_id;\s*continue;/g, "activeBranch[savedUserMsg.id] = parsed.message_id;\n                                    renderChat();\n                                    continue;");
file = file.replace(/activeBranch\[msgIdInt\] = parsed\.message_id;\s*continue;/g, "activeBranch[msgIdInt] = parsed.message_id;\n                                    renderChat();\n                                    continue;");
file = file.replace(/activeBranch\[newMsgObj\.id\] = parsed\.message_id;\s*continue;/g, "activeBranch[newMsgObj.id] = parsed.message_id;\n                                    renderChat();\n                                    continue;");
fs.writeFileSync('static/script.js', file);
