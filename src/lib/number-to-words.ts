
const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
const teens = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
const tens = ['', 'Sepuluh', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh', 'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];
const thousands = ['', 'Ribu', 'Juta', 'Miliar', 'Triliun'];

function convertLessThanOneThousand(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    const hundred = Math.floor(n / 100);
    if (hundred > 0) {
        result += (hundred === 1 ? 'Seratus' : ones[hundred] + ' Ratus');
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

    while (num > 0) {
        if (num % 1000 !== 0) {
            let chunk = convertLessThanOneThousand(num % 1000);
            if (i === 1 && num % 1000 === 1) { // Handle "Seribu"
                chunk = 'Seribu';
            } else {
                chunk += (i > 0 ? ' ' + thousands[i] : '');
            }
            result = chunk + (result ? ' ' + result : '');
        }
        num = Math.floor(num / 1000);
        i++;
    }

    return result.trim();
}
