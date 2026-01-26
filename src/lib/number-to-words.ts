
const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
const tens = ['', 'sepuluh', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
const thousands = ['', 'ribu', 'juta', 'miliar', 'triliun'];

function convertLessThanOneThousand(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    const hundred = Math.floor(n / 100);
    if (hundred > 0) {
        result += (hundred === 1 ? 'seratus' : ones[hundred] + ' ratus');
    }
    
    const remainder = n % 100;
    if (remainder > 0) {
        result += (result ? ' ' : '');
        if (remainder < 10) {
            result += ones[remainder];
        } else if (remainder < 20) {
            result += teens[remainder - 10];
        } else {
            result += tens[Math.floor(remainder / 10)];
            const one = remainder % 10;
            if (one > 0) {
                result += ' ' + ones[one];
            }
        }
    }
    
    return result;
}

export function toWords(num: number): string {
    if (num === 0) return 'Nol';

    let result = '';
    let i = 0;

    do {
        const chunk = num % 1000;
        if (chunk !== 0) {
            let chunkStr = '';
            if (i === 1 && chunk === 1) {
                chunkStr = 'seribu';
            } else {
                 chunkStr = convertLessThanOneThousand(chunk) + (thousands[i] ? ` ${thousands[i]}` : '');
            }
            result = `${chunkStr} ${result}`;
        }
        num = Math.floor(num / 1000);
        i++;
    } while (num > 0);

    // Capitalize first letter and trim
    const finalResult = result.trim();
    return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}
