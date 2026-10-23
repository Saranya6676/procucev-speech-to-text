// stream is a chunk of data 
const fs = require('fs')

const readStream = fs.createReadStream('./doc/HugeFile.txt')
// const writestream  = fs.writestream('./docs/copyHugeFile.txt')
// when we read a readStream we using on event listner
readStream.on('data',(buffer)=>{
    console.log(buffer)
})


// readStream.on('data',(buffer)=>{
//     console.log('/n new data is added  /n')
//     // writestream.write(buffer)
// })