const http = require('http');

const data = `علي الزيادي ٣٥٠٠
محمد الزيادي ٢٠٠٠
علي تكليف ٨٠٠٠ 
ام اباذر ٤٧٥٠
ابو فهد ١١٠٠٠ 
سيف باسم ٥٥٠٠
كرار الزرفي ٦٥٠٠
مهدي ١٣٢٥٠
بيت ابو كاظم ٢٥٠٠
كاظم مجيد ١٠٠٠
حسين كاظم ٢٠٠٠
علي مجيد ٣٢٥٠
علي ابو عريف ٥٥٠٠
حسين سيد علي ١٠٠٠ 
عمي نعمان ٨٦٥٠٠
حسن مجيد ٧٥٠
ميثم بشير ٥٧٥٠
حسنين عدنان ٤٠٠٠
سيد فلاح ٦٢٥٠٠
نظوري الميالي ٦٢٧٥٠
مقتدى ناظم ٧٠٠٠
سيد كرار ٣١٧٥٠
حمودي الاسمر ٢٠٠٠٠
ظرغام ابو عريف ٩٥٠٠ 
ام علي فاضل ٥٧٢٥٠ 
امير اخو اسعد ٣٥٢٥٠
ام سجاد ٢٥٠
حسين مسير ٥٧٥٠
حسن ابو عريف ٧٥٠٠
علي حسن ٨٠٠٠
سعد ابو مسلم ١٠٠٠
ظرغام الزرفي ١٢٢٥٠
حسن ابو عريف ٢٩٢٥٠
ابو جودت ١٨٠٠٠٠
يوسف اخو عماد ٢١٥٠٠
علي شاكر ١٧٥٠٠
ابو عباس ٢٥٠٠٠
زيودي الزرفي ١٣٥٠٠
انور حميد ٢٥٠٠
سيد قاسم ٥٠٠٠ 
سجاد تحرير ٣٨٢٥٠
رضا الجبوري ٢٠٠٠
علي فاظل ٢٠٠٠
مرتضى الحلاق ٣٥٠٠
خالد ابو مسلم ٨٧٥٠`;

const arabicToEnglishNums = (str) => {
  return str.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
};

const lines = data.split('\n').map(l => l.trim()).filter(Boolean);

const sendDebt = (name, amount) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: 'CUSTOMER',
      personName: name,
      amount: parseInt(amount, 10),
      paidAmount: 0
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/debts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => resolve(responseBody));
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

(async () => {
  for (const line of lines) {
    const parts = line.split(' ');
    // The amount is always the last part
    const amtStr = arabicToEnglishNums(parts.pop().trim());
    const name = parts.join(' ').trim();
    
    console.log(`Adding ${name} - ${amtStr} ...`);
    try {
      await sendDebt(name, amtStr);
      console.log('Success.');
    } catch(err) {
      console.error('Failed:', err.message);
    }
  }
  console.log('Done!');
})();
