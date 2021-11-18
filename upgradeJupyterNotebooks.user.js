// ==UserScript==
// @name         upgrade jupyter notebooks
// @namespace    http://github.com/farishijazi/
// @version      0.3
// @description  upgrade jupyter notebook
// @description  add F2 hotkey to scroll page to latest run cell
// @description  autoconfirm "restart kernel"
// @description  rename audio elements (does so based on the printed python text right before them)
// @description  colors ribbon based on name (unique to each URL), useful when switching between many notebooks
// @author       http://github.com/farishijazi/
// @match        *://*/*.ipynb
// @require      https://code.jquery.com/jquery-3.4.0.min.js
// @grant        unsafeWindow
// @run-at       document-end
// @update-url   https://github.com/FarisHijazi/JupyterNotebookUserScript/raw/master/upgradeJupyterNotebooks.user.js
// ==/UserScript==

if (typeof unsafeWindow === 'undefined') {
    unsafeWindow = window;
}

/**
 *
 * @param {(String|String[]|Function)} getter -
 *      string: selector to return a single element
 *      string[]: selector to return multiple elements (only the first selector will be taken)
 *      function: getter(mutationRecords|{})-> Element[]
 *          a getter function returning an array of elements (the return value will be directly passed back to the promise)
 *          the function will be passed the `mutationRecords`
 * @param {Object} opts
 * @param {Number=0} opts.timeout - timeout in milliseconds, how long to wait before throwing an error (default is 0, meaning no timeout (infinite))
 * @param {Element=} opts.target - element to be observed
 *
 * @returns {Promise<Element|any>} the value passed will be a single element matching the selector, or whatever the function returned
 */
function elementReady(getter, opts = {}) {
    return new Promise((resolve, reject) => {
        opts = Object.assign({
            timeout: 0,
            target: document.documentElement
        }, opts);
        const returnMultipleElements = getter instanceof Array && getter.length === 1;
        let _timeout;
        const _getter = typeof getter === 'function' ?
            (mutationRecords) => {
                try {
                    return getter(mutationRecords);
                } catch (e) {
                    return false;
                }
            } :
            () => returnMultipleElements ? document.querySelectorAll(getter[0]) : document.querySelector(getter)
        ;
        const computeResolveValue = function (mutationRecords) {
            // see if it already exists
            const ret = _getter(mutationRecords || {});
            if (ret && (!returnMultipleElements || ret.length)) {
                resolve(ret);
                clearTimeout(_timeout);

                return true;
            }
        };

        if (computeResolveValue(_getter())) {
            return;
        }

        if (opts.timeout) {
            _timeout = setTimeout(() => {
                const error = new Error(`elementReady(${getter}) timed out at ${opts.timeout}ms`);
                reject(error);
            }, opts.timeout);
        }

        new MutationObserver((mutationRecords, observer) => {
            const completed = computeResolveValue(_getter(mutationRecords));
            if (completed) {
                observer.disconnect();
            }
        }).observe(opts.target, {
            childList: true,
            subtree: true
        });
    });
}

/**
 * @param {function} callback
 * @param {MutationObserverInit=} options
 * @param {number} [options.callbackMode=0] - 0: single callback per batch (pass `mutations`), 1: callback for each added node
 * @param {(Element|String)} [options.baseNode='body'] - 0: selector for the baseNode
 *
 * @param {string[]} [options.attributeFilter=[]] Optional
 * @param {boolean} [options.attributeOldValue=false] Optional
 * @param {boolean} [options.attributes=false] Optional
 * @param {boolean} [options.characterData=false] Optional
 * @param {boolean} [options.characterDataOldValue=false] Optional
 * @param {boolean} [options.childList=false] Optional
 * @param {boolean} [options.subtree=false] Optional
 *
 * @returns {MutationObserver}
 */
function observeDocument(callback, options = {}) {
    options = $.extend({
        callbackMode: 0, // 0: single callback per batch (pass `mutations`), 1: callback for each added node
        baseNode: 'body',

        attributeFilter: [],
        attributeOldValue: true,
        attributes: true,
        characterData: false,
        characterDataOldValue: false,
        childList: true,
        subtree: true,
    }, options);

    let observer = {};
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    const baseNode = options.baseNode instanceof Element ? () => options.baseNode : options.baseNode;

    elementReady((mutationRecords) => $(baseNode).length !== 0 ? mutationRecords : null).then((mutationRecords) => {
        callback(mutationRecords);
        if (!MutationObserver) {
            document.addEventListener('DOMAttrModified', callback, false);
            document.addEventListener('DOMNodeInserted', callback, false);
        } else {
            observer = new MutationObserver(function (mutations, me) {
                observer.disconnect();

                switch (options.callbackMode) {
                    case 0:
                        callback(mutations, me);
                        break;
                    case 1:
                        for (const mutation of mutations) {
                            if (mutation.addedNodes.length) {
                                callback(mutation, me);
                            }
                        }
                        break;
                }
                observer.continue();
            });
            observer.continue = () => observer.observe(document.documentElement, options);

            observer.continue();

            return observer;

        }
    });
    return observer;
}

/**
 *
 *  Secure Hash Algorithm (SHA1)
 *  http://www.webtoolkit.info/
 *
 **/
function SHA1(msg) {
    function rotate_left(n, s) {
        var t4 = (n << s) | (n >>> (32 - s));
        return t4;
    };

    function lsb_hex(val) {
        var str = "";
        var i;
        var vh;
        var vl;

        for (i = 0; i <= 6; i += 2) {
            vh = (val >>> (i * 4 + 4)) & 0x0f;
            vl = (val >>> (i * 4)) & 0x0f;
            str += vh.toString(16) + vl.toString(16);
        }
        return str;
    };

    function cvt_hex(val) {
        var str = "";
        var i;
        var v;

        for (i = 7; i >= 0; i--) {
            v = (val >>> (i * 4)) & 0x0f;
            str += v.toString(16);
        }
        return str;
    };


    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    };

    var blockstart;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;

    msg = Utf8Encode(msg);

    var msg_len = msg.length;

    var word_array = new Array();
    for (i = 0; i < msg_len - 3; i += 4) {
        j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
            msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
        word_array.push(j);
    }

    switch (msg_len % 4) {
        case 0:
            i = 0x080000000;
            break;
        case 1:
            i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
            break;

        case 2:
            i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
            break;

        case 3:
            i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
            break;
    }

    word_array.push(i);

    while ((word_array.length % 16) != 14) word_array.push(0);

    word_array.push(msg_len >>> 29);
    word_array.push((msg_len << 3) & 0x0ffffffff);


    for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {

        for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
        for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

        A = H0;
        B = H1;
        C = H2;
        D = H3;
        E = H4;

        for (i = 0; i <= 19; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 20; i <= 39; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 40; i <= 59; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 60; i <= 79; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        H0 = (H0 + A) & 0x0ffffffff;
        H1 = (H1 + B) & 0x0ffffffff;
        H2 = (H2 + C) & 0x0ffffffff;
        H3 = (H3 + D) & 0x0ffffffff;
        H4 = (H4 + E) & 0x0ffffffff;

    }

    var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

    return temp.toLowerCase();

}

unsafeWindow.SHA1 = SHA1;


(function () {
    'use strict';
    // set notebook container to max width
    var container = document.querySelector('#notebook-container');
    if (container) container.style.width = 'max-content';

    observeDocument(function () {
        // restart button confirm
        var submitButtonDanger = document.querySelector("body > div.modal.fade.in > div > div > div.modal-footer > button.btn.btn-default.btn-sm.btn-danger");
        console.debug('submitButtonDanger', submitButtonDanger);
        if (submitButtonDanger && (submitButtonDanger.innerText === 'Restart and Run All Cells' || submitButtonDanger.innerText === 'Restart')) {
            console.log('clicking submitButtonDanger');
            submitButtonDanger.click();
        }

        // update audio names
        console.debug("updating audio names");
        Array.from(document.querySelectorAll("#notebook-container > div.cell.code_cell.rendered.selected > div.output_wrapper > div.output > div.output_area audio")).forEach(audio => {
            var closestPre = audio.closest('div.output_area').previousElementSibling.querySelector('div > pre');
            if (closestPre) {
                audio.title = closestPre.innerText;
            }
        });


        document.querySelectorAll('.output_wrapper').forEach(output=>{
            if (output.querySelector('.dlbtn')) return;
            var dlbtn = document.createElement('a');
            dlbtn.innerText = '[⬇️] download cell HTML';
            dlbtn.classList.add('dlbtn');
            dlbtn.onclick = function(){
                console.log('clicked!!', output.innerHTML);
                anchorClick(makeTextFile('<html><body>'+output.innerHTML+'</body></html>'), document.title + ' cell output.html');
            }
            var output_subarea = output.querySelector('.output_subarea')
            if (output_subarea) output_subarea.firstElementChild.before(dlbtn);
        })

    });


        function anchorClick(href, downloadValue, target) {
            downloadValue = downloadValue || '_untitled';
            var a = document.createElement('a');
            a.setAttribute('href', href);
            a.setAttribute('download', downloadValue);
            a.target = target;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        function saveByAnchor(url, dlName) {
            anchorClick(url, dlName);
        }
        function makeTextFile(text) {
            const data = new Blob([text], { type: 'text/plain' });
            var textFile = null;
            // If we are replacing a previously generated file we need to manually revoke the object URL to avoid memory leaks.
            if (textFile !== null) window.URL.revokeObjectURL(textFile);
            return window.URL.createObjectURL(data);
        }

    // colorizing based on title
    /*
     * Idea: Abdulaziz Alshamrani
     */
    observeDocument(function () {
        var titleEl = document.querySelector("#notebook_name");
        var identifier = document.querySelector("#notebook_name").innerText; // or choose locaiton.href
        if (identifier.length) {
            var sha1sum = SHA1(identifier);
            console.debug(identifier, 'sha1sum', sha1sum);
            document.querySelector("#menubar-container").style.backgroundColor = "#" + sha1sum.slice(0, 6);
        }
    }, {baseNode: "#notebook_name"});


    // F2 hotkey to scroll to latest cell
    document.addEventListener('keyup', (e) => {
        if (e.code === "F2") {
            // jump to latest cell in notebook
            (function () {     var cellCounters = document.querySelectorAll([        "#notebook-container > div > div.input > div.prompt_container > div.prompt.input_prompt",        "div > div.lm-Widget.p-Widget.lm-Panel.p-Panel.jp-Cell-inputWrapper > div.lm-Widget.p-Widget.jp-InputArea.jp-Cell-inputArea > div.lm-Widget.p-Widget.jp-InputPrompt.jp-InputArea-prompt"    ].join());    function getNum(val) {        if (isNaN(val)) {            return 0;        }        return val;    }    var numbers = [].map.call(cellCounters, a => {        try {            let number = a.innerText.match(/\[(.+)\]/)[1].replace("*", '999999999999999999').replace("%C2%A0", '-1');            return isNaN(number) ? 0 : parseInt(number);        } catch (e) {        }        return 0;    }).map(getNum);    var maxIndex = numbers.indexOf(Math.max(...numbers));    var lastCell = cellCounters[maxIndex];    lastCell.click();    lastCell.closest('.cell, .jp-CodeCell').querySelector('.output_wrapper, .jp-Cell-outputWrapper').scrollIntoViewIfNeeded();})();
        }
    });

})();

