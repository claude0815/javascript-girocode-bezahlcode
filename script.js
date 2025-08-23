'use strict';

const output = {
	'girocode': document.querySelector('#girocode'),
	'bezahlcode': document.querySelector('#bezahlcode'),
	'girocodeString': document.querySelector('#girocode-string'),
	'bezahlcodeString': document.querySelector('#bezahlcode-string')
};

const fields = {
	'bic': document.querySelector('#bic'),
	'recipient': document.querySelector('#recipient'),
	'iban': document.querySelector('#iban'),
	'currency': document.querySelector('#currency'),
	'amount': document.querySelector('#amount'),
	'reason': document.querySelector('#reason')
};

const settings = {
	'barcodeSize': 384,
	'darkColor': '#000000',
	'lightColor': '#ffffff'
};

const replaceSpecialCharacters = function (input) {
	let value = input.replace(/Ä/g, 'AE');
	value = value.replace(/Ö/g, 'OE');
	value = value.replace(/Ü/g, 'UE');
	value = value.replace(/ẞ/g, 'SS');
	value = value.replace(/ä/g, 'ae');
	value = value.replace(/ö/g, 'oe');
	value = value.replace(/ü/g, 'ue');
	value = value.replace(/ß/g, 'ss');

	return value;
};

const giroCodeString = function (params) {
	const sep = "\n";

	const data = {
		'service': 'BCD',
		'version': params.bic.trim() ? '001' : '002',
		'encoding': '1', // 1 = UTF-8, 2 = ISO 8859-1
		'transfer': 'SCT',
		'bic': params.bic,
		'name': params.name.substring(0,70), // max of 70 characters
		'iban': params.iban,
		'currency': params.currency.trim().toUpperCase(),
		'amount': params.amount,
		'char': '', // 4 digit key - like SALA, ...
		'ref': '', // reference - alternative to reason, max of 25 characters
		'reason': params.reason.replace(sep, ' ').substring(0, 140), // max of 140 characters
		'hint': '' // max of 70 characters
	};

	let epcString = data.service;
	epcString += sep + data.version;
	epcString += sep + data.encoding;
	epcString += sep + data.transfer;
	epcString += sep + data.bic;
	epcString += sep + data.name;
	epcString += sep + data.iban;
	epcString += sep + data.currency + data.amount;
	epcString += sep + data.char;
	epcString += sep + data.ref;
	epcString += sep + data.reason;
	epcString += sep + data.hint;

	return epcString;
}

const makeGiroCode = function () {

	const str = giroCodeString({
		'bic': fields.bic.value,
		'name': fields.recipient.value,
		'iban': fields.iban.value,
		'currency': fields.currency.value,
		'amount': fields.amount.value,
		'reason': fields.reason.value
	});

	output.girocodeString.innerHTML = str; console.log(str);// str.replaceAll("\n", '<br>');
	makeQR(output.girocode, str);
}

const bezahlCodeString = function (params) {

	const data = {};

	data.bic = params.bic.toUpperCase().trim();
	data.name = params.name.toUpperCase().trim();
	data.iban = params.iban.replace(' ', '').toUpperCase().trim();
	data.amount = parseFloat(params.amount.trim().replace(',', '.')).toString().replace('.', ',');
	data.reason = params.reason.trim().replace("\n", ' ').substring(0, 140);

	if (params.currency.trim().toUpperCase() != 'EUR') {
		alert('Bezahlcode unterstützt nur Beträge in Euro!');
		return '';
	}

	const parameters = new URLSearchParams(data).toString();
	const bezahlCodeString = 'bank://singlepaymentsepa?' + parameters.replace('+', '%20');

	return bezahlCodeString;
}

const makeBezahlCode = function () {

	const str = bezahlCodeString({
		'bic': fields.bic.value,
		'name': fields.recipient.value,
		'iban': fields.iban.value,
		'currency': fields.currency.value,
		'amount': fields.amount.value,
		'reason': fields.reason.value
	});

	output.bezahlcodeString.innerHTML = str;
	makeQR(output.bezahlcode, str);
}

const makeQR = function (ele, str) {
	if (str.length > 0) {
		const bezahlCode = new QRCode(ele, {
			width : settings.barcodeSize,
			height : settings.barcodeSize,
			colorDark : settings.darkColor,
			colorLight : settings.lightColor,
			correctLevel : QRCode.CorrectLevel.M,
			useSVG: true
		});

		bezahlCode.makeCode(str);
	}
}

const updateHash = function() {
	const oSearchParams = new URLSearchParams({
		'bic': fields.bic.value,
		'name': fields.recipient.value,
		'iban': fields.iban.value,
		'currency': fields.currency.value,
		'amount': fields.amount.value,
		'reason': fields.reason.value
	});
	location.hash = '#' + oSearchParams.toString();
}

const updateFromhash = function() {
	const oSearchParams = new URLSearchParams(location.hash.substring(1));
	fields.bic.value = oSearchParams.get('bic');
	fields.recipient.value = oSearchParams.get('name');
	fields.iban.value = oSearchParams.get('iban');
	fields.currency.value = oSearchParams.get('currency');
	fields.amount.value = oSearchParams.get('amount');
	fields.reason.value = oSearchParams.get('reason');
}

const updateCode = function (e) {
	e.preventDefault();

	// todo: do some more (?) sanity value checking here

	fields.recipient.value = replaceSpecialCharacters(fields.recipient.value).trim();
	fields.bic.value = replaceSpecialCharacters(fields.bic.value).replace(/\s/g, '').trim();
	fields.iban.value = fields.iban.value.replace(/\s/g, '').trim(); // thanks @WaellerKlaus
	fields.reason.innerText = replaceSpecialCharacters(fields.reason.innerText).trim().replace("\n", ' ');
	fields.amount.value = parseFloat(fields.amount.value.replace(',', '.')).toFixed(2); // fields.amount.value.toLocaleString("en-US")

	updateIBAN();

	makeGiroCode();
	makeBezahlCode();
	updateHash();
}

document.querySelector('#generate').addEventListener('click', updateCode);
fields.iban.addEventListener('blur', updateIBAN);

document.querySelectorAll('a[download]').forEach(function (ele, i) {
	ele.addEventListener('click', function (e) {
		const svg = e.target.parentNode.querySelector('.code svg');
		if (!svg) { return false; }

		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		ele.setAttribute('href', 'data:image/svg+xml;utf8,' + svg.outerHTML);
	});
});

updateFromhash();
addEventListener("hashchange", updateFromhash)

// groundwork for IBAN checking, https://stackoverflow.com/a/58973586/3625228
function validIBAN (value) {
	let rearrange =
		value.substring(4, value.length)
		+ value.substring(0, 4);
	let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
	let alphaMap = {};
	let number = [];

	alphabet.forEach((value, index) => {
		alphaMap[value] = index + 10;
	});

	rearrange.split('').forEach((value, index) => {
		number[index] = alphaMap[value] || value;
	});

	return modulo(number.join('').toString(), 97) === 1;
}

function modulo (aNumStr, aDiv) {
	var tmp = "";
	var i, r;
	for (i = 0; i < aNumStr.length; i++) {
		tmp += aNumStr.charAt(i);
		r = tmp % aDiv;
		tmp = r.toString();
	}
	return tmp / 1;
}

function updateIBAN () {
	const IBANvalid = validIBAN(fields.iban.value);
	console.log('IBAN seems to be', IBANvalid ? 'valid' : 'invalid');
	document.querySelector('label[for="iban"]').setAttribute('data-valid', IBANvalid);
}

/*
// fill in test data
document.querySelector('#bic').value = 'SOLADES1PFD';
document.querySelector('#recipient').value = 'Girosolution GmbH';
document.querySelector('#iban').value = 'DE19690516200000581900';
document.querySelector('#amount').value = '22.30';
document.querySelector('#reason').value = 'testzweck';
*/
