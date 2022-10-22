import { asm_table } from "./table";

let labels = {};

function isHex(str) {
    if (!str) {
        return false;
    }

    if (!str.startsWith("#") && str.split("").filter((c) => c < '0' || c > '9').length == str.length) {
        return false;
    }

    str = str.replaceAll("#", "");

    return str.split("").filter((c) => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')).length == str.length;
}

function swapHex(hex) {
    hex = hex.replaceAll("#", "");

    if (hex.length % 2 != 0) {
        hex = "0" + hex;
    }

    let bits = [];
    for (let i = hex.length; i > 0; i -= 2) {
        bits.push(hex.substring(i - 2, i));
    }
    return bits;
}

function addrFillZero(str, len) {
    str = str.replaceAll("#", "");
    return "0".repeat(len - str.length) + str;
}

function compOperant(opMask, opGiven) {
    if (opMask == opGiven && opMask != "n" && opMask != "nn") {
        return [];
    }

    if ((opMask == "n" || opMask == "nn") && isHex(opGiven)) {
        let hex = swapHex(addrFillZero(opGiven, opMask == "n" ? 2 : 4));
        if (hex.length != 0 && hex.length <= (opMask == "n" ? 1 : 2)) {
            return hex;
        }
    }

    if ((opMask == "(n)" || opMask == "(nn)") && opGiven.startsWith("(")) {
        let inside = opGiven.substring(1, opGiven.length-1);
        if (isHex(inside)) {
            let hex = swapHex(addrFillZero(inside, opMask == "(n)" ? 2 : 4));
            if (hex.length != 0 && hex.length <= (opMask == "(n)" ? 1 : 2)) {
                return hex;
            }
        }
    }
    if (opMask == "nn" && labels[opGiven] != undefined) {
        let addr = labels[opGiven];
        return swapHex(addrFillZero(addr.toString(16), 4));
    }

    return null;
}

function findMatch(_opCode, _operant) {
    for (let data of asm_table) {
        let [opCode, operant, binary] = (data.length == 3 ? data : [ data[0], '', data[1] ]);

        operant = operant.toLowerCase().split(',').filter(x => x.length);
        binary = binary.split(' ').filter(x => x.length);

        let bits = [ binary[0] ];

        if (_opCode != opCode) {
            continue;
        }

        if (_operant.length != operant.length) {
            continue;
        }

        var wrong = false;
        for (let i = 0; i < _operant.length; ++ i) {
            let hex = compOperant(operant[i], _operant[i]);
            if (hex == null) {
                wrong = true;
                break;
            }
            bits = bits.concat(hex);
        }

        if (wrong) {
            continue;
        }

        return bits;
    }

    return null;
}

function preCompile(lines, worksheet, log) {
    for (let ln = 0; ln < lines.length; ++ ln) {
        let line = lines[ln];
        let s = line.toLowerCase().split(';');
        let instructions = s[0].trim().split(' '); // remove comment
        let comment = line.substring(s[0].length, line.length);

        let opCode = instructions[0];

        // there is no instruction in line, skip
        if (opCode.length == 0) {
            continue;
        }

        // get operant
        let operant = instructions.slice(1, instructions.length).join('').split(',');

        if (opCode.endsWith(":")) {
            let name = opCode.substring(0, opCode.length - 1);
            if (labels[name]) {
                log("!!!Label with the name '" + name + "' already exist!\n");
            }
            labels[name] = 0;
            continue;
        }
    }
}

function postCompile(lines, worksheet, log) {
    var addr = 0;
    let exnm = 0;

    for (let ln = 0; ln < lines.length; ++ ln) {
        let line = lines[ln];
        let s = line.split(';');
        let instructions = s[0].trim().split(' '); // remove comment
        let comment = line.substring(s[0].length, line.length);
        let opCode = instructions[0].toLowerCase();

        // get operant
        let operant = instructions.slice(1, instructions.length).join('').toLowerCase().split(',').filter(x => x.length);

        if (opCode == ".org" || opCode == "org") {
            if (operant.length == 1 && isHex(operant[0]) && operant[0].length > 1) {
                let newAddr = parseInt(Number("0x" + operant[0].replaceAll("#", "")), 10);
                if (newAddr < addr) {
                    log("Failed to set origin, addresses are overlapping! Try higher org value.\n");
                } else {
                    addr = newAddr;
                }
            } else {
                log("Invalid usage of origin command, do: .ORG #ADDR\n");
            }
            continue;
        }
        //worksheet.cell(exnm, 0, ""+(ln+1));

        if (opCode.endsWith(":")) {
            labels[opCode.substring(0, opCode.length - 1)] = addr;
            worksheet.cell(exnm, 1, opCode);
            continue;
        }

        // there is no instruction in line, skip
        if (opCode.length != 0) {
            let data = findMatch(opCode, operant);
            if (data) {
                worksheet.cell(exnm, 0, addrFillZero(addr.toString(16).toUpperCase(), 4));
                worksheet.cell(exnm, 3, data.join(" ").toUpperCase());
                worksheet.cell(exnm, 2, instructions.join(' '));
                worksheet.cell(exnm, 4, comment.trim());
                addr += data.length;
            } else {
                log(`Syntax error at line ${ln+1}: ${line.trim()}`);
                worksheet.cell(exnm, 1, "Error: " + line.trim());
            }
        }

        exnm ++;
    }
}

export function compile(lines, worksheet, log) {
    labels = {};
    preCompile(lines, worksheet, log);
    postCompile(lines, worksheet, ()=>{});
    postCompile(lines, worksheet, log);
}
