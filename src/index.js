import { compile } from "./compiler"
import { utils, writeFile } from "xlsx"

class Worksheet {
    constructor() {
        this.data = {}
    }

    cell(row, column, value) {
        if (!this.data[row]) {
            this.data[row] = {};
        }
        this.data[row][column] = value;
    }

    _strFillSpace(str, len) {
        return str + " ".repeat(Math.max(len - str.length, 0));
    }

    convertToArray() {
        const rowTable = [];
        const maxrow = Object.keys(this.data).at(-1);

        for (let row = 0; row <= maxrow; row ++) {
            const columnTable = [];
            if (this.data[row]) {
                const maxcolumn = Object.keys(this.data[row]).at(-1);
                for (let column = 0; column <= maxcolumn; column ++) {
                    columnTable.push(this.data[row][column] || "");
                }
            }
            rowTable.push(columnTable);
        }
        return rowTable;
    }

    toString() {
        const table = this.convertToArray();
        let text = "";

        for (const row of table) {
            for (const column of row) {
                text += this._strFillSpace(column, 20)
            }
            text += '\n';
        }

        return text;
    }

    exportXLSX() {
        const table = this.convertToArray();
        const workbook = utils.book_new(), worksheet = utils.aoa_to_sheet(table);
        workbook.SheetNames.push("Code");
        workbook.Sheets["Code"] = worksheet;
        worksheet['!cols'] = table[0].map((_, i) => ({ 
            wch: Math.max(...table.map(a => a[i] ? a[i].toString().length : 0)) 
        }));

        writeFile(workbook, "Z80.xlsx");
    }
}

window.addEventListener('load', () => {
    const input = document.getElementById("input")
    const output = document.getElementById("output")

    const convert = () => {
        const lines = input.value.split("\n");
        let worksheet = new Worksheet();
        let message = "";

        compile(lines, worksheet, (x) => message += x + "\n");

        if (message.length > 0) {
            alert(message);
        }

        return worksheet;
    };

    document.getElementById("convert").onclick = () => {
        if (input.value.trim().length == 0) {
            alert("Nothing to convert, write some Z80 code into the input field first!");
        } else {
            output.value = convert().toString();
        }
    }

    document.getElementById("export").onclick = () => {
        if (input.value.trim().length == 0) {
            alert("Nothing to export, write some Z80 code into the input field first!");
        } else {
            const worksheet = convert();
            output.value = worksheet.toString();
            worksheet.exportXLSX();
        }
    }

    document.getElementById("upload").onchange = (e) => {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            const reader = new FileReader();
            if (e.target.files && e.target.files[0]) {           
                reader.onload = function (e2) {
                    input.value = e2.target.result;
                    output.value = convert().toString();
                };
                reader.readAsText(e.target.files[0]);
            }
            return true; 
        } else {
            alert('The File APIs are not fully supported by your browser. Fallback required.');
        }
        return false;
    }
})

