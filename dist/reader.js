const tagRE = /\[(?<tag>.*)\((?<params>.*)\)\]/;
const dialogRE = /\[[Nn]ame=\"(?<name>.*)\"\](?<text>.*)/;
const decisionRE = /\[[dD]ecision\(options="(?<options>.*)"[,|, ]+values="(?<values>.*)"\)\]/;
const tagList = [
  "HEADER",
  "PLAYMUSIC",
  "BACKGROUND",
  "DELAY",
  "CHARACTER",
  "BLOCKER",
  "IMAGE",
  "IMAGETWEEN",
  "STOPMUSIC",
  "DECISION",
  "PREDICATE",
  "PLAYSOUND",
  "CAMERASHAKE",
  "DIALOG",
  "BACKGROUNDTWEEN",
  "CAMERAEFFECT",
  "CHARACTERCUTIN",
  "STOPSOUND",
  "DALEY",
  "HIDEITEM",
  "DIALOG",
  "DESCRIPTION",
];

const inputElement = document.getElementById("input");
inputElement.addEventListener("change", read, false);
var wb = XLSX.utils.book_new();
var files = document.getElementById("input").files;
var resultElement = document.getElementById(`result`);
var finished = [];
var char_names = [];
var char_names_used = [];
var converted_sheet = [];

var getCharNamesImagesElement = document.getElementById("CHAR_NAMES_IMAGES");
getCharNamesImagesElement.addEventListener("change", getCharImageChange, false);
var isSelectedGetCharNames = document.getElementById("CHAR_NAMES").checked;
var isSelectedGetCharNamesImages = getCharNamesImagesElement.checked;
function read() {
  reset();
  files = document.getElementById("input").files;
  resultElement.style.display = `block`;
  for (var i = 0; i < files.length; i++) {
    var node = document.createElement("P");
    var textnode = document.createTextNode(`${files[i].name}...loaded`);
    node.appendChild(textnode);
    resultElement.appendChild(node);
  }
  document.getElementById("convert").style.display = `block`;
}

function convert() {
  wb = XLSX.utils.book_new();
  finished = [];
  char_names = [];
  char_names_used = [];

  var selection = [];
  var selectInputs = document.getElementsByName(`TAG`);
  isSelectedGetCharNames = document.getElementById("CHAR_NAMES").checked;
  isSelectedGetCharNamesImages = getCharNamesImagesElement.checked;
  for (var t = 0; t < selectInputs.length; t++) {
    if (selectInputs[t].checked) {
      selection.push(selectInputs[t].value);
      if (selectInputs[t].value === `DECISION`) selection.push(`PREDICATE`);
      if (selectInputs[t].value === `PLAYMUSIC`) selection.push(`STOPSOUND`);
    }
  }
  for (var i = 0; i < files.length; i++) {
    var result = [];
    var lastLine = "";
    var reader = new FileReader();
    var lines = [];
    reader.onload = (e) => {
      result = [];
      lines = e.target.result.split("\n");
      var decision = {};
      var char_image = "";
      lines.forEach((line, line_index) => {
        if (line.match(tagRE)) {
          var { tag, params } = line.match(tagRE).groups;
          tag = tag.toUpperCase();
          if (selection.includes(tag)) {
            if (tag === `DECISION`) {
              params = line.match(decisionRE).groups;
              Object.keys(params).forEach((key) => {
                params[key] = params[key].split(`;`).map((v) => v.trim());
              });
            } else {
              var obj = {};
              params = params.split(`,`);
              params.forEach((param) => {
                param = param.trim();
                var [key, value] = param.split(`=`);
                obj[key] = value.replaceAll(`"`, ``);
              });
              params = obj;
            }

            if (![`PREDICATE`, tag].includes(lastLine) && result.length > 0)
              result.push([""]);

            switch (tag) {
              case `BACKGROUND`:
                result.push([`[BACKGROUND]`, params.image || `bg_black`]);
                break;
              case `IMAGE`:
                result.push([`[IMAGE]`, params.image || `bg_black`]);
                break;
              case `DECISION`:
                result.push([`[DECISION]`]);
                params.options.forEach((option, option_index) => {
                  var value = params.values[option_index];
                  result.push([`[OPTION ${value}]`, option]);
                  decision[value] = result.length;
                });
                result.push([`[END_DECISION]`]);
                break;
              case `PREDICATE`:
                params.references = params.references.split(`;`);
                var references = [];
                params.references.forEach((ref) =>
                  references.push(decision[ref])
                );
                result.push([
                  `[PREDICATE]`,
                  params.references.join(`,`),
                  `from line ${references.join(`,`)}`,
                ]);
                break;
              case `CHARACTER`:
                if (params.name) {
                  var arr = [`[CHARACTER]`, params.name];
                  if (params.name2)
                    arr = [
                      `[CHARACTER]`,
                      params.name,
                      params.name2,
                      `focus ${params.focus}`,
                    ];
                  result.push(arr);
                  if (isSelectedGetCharNamesImages) {
                    if (params.name2 && params.focus === "2") {
                      char_image = params.name2;
                    } else {
                      char_image = params.name;
                    }
                  }
                } else {
                  result.pop();
                }
                break;
              case `PLAYMUSIC`:
                result.push([
                  `[PLAYMUSIC]`,
                  `intro:${params.intro.replace(`$`, ``)}`,
                  `loop:${params.key.replace(`$`, ``)}`,
                ]);
                break;
              case `PLAYSOUND`:
                result.push([`[PLAYSOUND]`, params.key.replace(`$`, ``)]);
                break;
              case `STOPSOUND`:
                result.push([`[STOPSOUND]`]);
              case `CAMERASHAKE`:
                result.push([`[CAMERASHAKE]`]);
                break;
              default:
                break;
            }
            lastLine = tag;
          } else {
            //Extra Character Names + Images
            if (isSelectedGetCharNamesImages) {
              if (tag === "CHARACTER") {
                var obj = {};
                params = params.split(`,`);
                params.forEach((param) => {
                  param = param.trim();
                  var [key, value] = param.split(`=`);
                  obj[key] = value.replaceAll(`"`, ``);
                });
                params = obj;
                if (params.name2 && params.focus === "2") {
                  char_image = params.name2;
                } else {
                  char_image = params.name;
                }
              }
            }
          }
        } else {
          if (line.match(dialogRE)) {
            var { name, text } = line.match(dialogRE).groups;
            if (text.length > 1 && text[0] === " ") text = text.trim();
            if (
              ![`DIALOG`, `PREDICATE`, `CHARACTER`].includes(lastLine) &&
              result.length > 0
            )
              result.push([""]);
            result.push([name, text]);
            //Extra Character Names
            if (isSelectedGetCharNames) {
              if (!char_names_used.includes(name)) {
                var arr = [name];
                if (isSelectedGetCharNamesImages) {
                  arr.push(char_image);
                }
                char_names.push(arr);
                char_names_used.push(name);
              } else {
                char_names.forEach((m) => {
                  if (m[0] === name) {
                    if (!m.includes(char_image)) {
                      m.push(char_image);
                    }
                  }
                });
              }
            }
            lastLine = `DIALOG`;
          } else {
            if (line.length > 1 && line[0] !== `[` && !line.includes(`//`)) {
              if (lastLine !== `DESCRIPTION` && result.length > 0)
                result.push([""]);
              result.push(["", line]);
              lastLine = `DESCRIPTION`;
            }
            //Extra Character Names + Images
            if (line === /[cC]haracter/) {
              char_image = "";
            }
          }
        }
      });
    };
    reader.onloadend = (e) => {
      var ws = XLSX.utils.aoa_to_sheet(result);
      converted_sheet.push(ws);
      finished.push(files[finished.length].name);
      var node = document.createElement("P");
      var textnode = document.createTextNode(
        `${finished[finished.length - 1]}...finished`
      );
      node.appendChild(textnode);
      resultElement.appendChild(node);
      if (finished.length === files.length) {
        document.getElementById("download").style.display = `block`;
        document.getElementById("reset").style.display = `block`;
      }
    };
    reader.readAsText(files[i]);
  }
}

function download() {
  if (isSelectedGetCharNames) {
    var ws = XLSX.utils.aoa_to_sheet(char_names);
    XLSX.utils.book_append_sheet(wb, ws, "Characters");
  }
  for (var i = 0; i < finished.length; i++) {
    XLSX.utils.book_append_sheet(
      wb,
      converted_sheet[i],
      files[i].name.replace(`.txt`, ``)
    );
  }
  XLSX.writeFile(wb, files[0].name.replace(`.txt`, `.xlsx`));
}
function reset() {
  wb = XLSX.utils.book_new();
  finished = [];
  char_names = [];
  char_names_used = [];
  resultElement.innerHTML = "";
  document.getElementById("download").style.display = `none`;
  document.getElementById("reset").style.display = `none`;
  document.getElementById("convert").style.display = `none`;
}

function getCharImageChange() {
  if (getCharNamesImagesElement.checked) {
    document.getElementById("CHAR_NAMES").checked = true;
  }
}
