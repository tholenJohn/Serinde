const dollar = new Intl.NumberFormat('en-US',
{
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
})

module.exports.dollar = dollar;


