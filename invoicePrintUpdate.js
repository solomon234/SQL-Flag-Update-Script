// ----- Set up -----
const sql = require('mssql');
const nodemailer = require('nodemailer');

//Set up SQL connection

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  host: '' ,
  port: 1,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'admin', // generated ethereal user
    pass: 'admin' // generated ethereal password
  }
});

// ----- Get data from SQL server -----
//Open SQL connection
sql.connect(config).then(pool => {
    return pool.request()
      .query(`SELECT DISTINCT MRCSHH.ID_PK FROM MRCSHH LEFT JOIN MRCUST ON MRCUST.CUST_ID = MRCSHH.CUST_ID AND MRCUST.IsDeleted = 0 LEFT JOIN MREMAILS ON MRCUST.CUST_ID = MREMAILS.CUST_ID and isnull(mremails.billing,0) = 1 and mremails.IsDeleted = 0 WHERE (CAST(GEN_DT AS DATE) = (SELECT [MetroBase].ufnGetGenDate()))  AND INV_PRT_FL <> 1 AND (ISNULL(PRINT_INVOICES,0) <> 1 and isnull(mremails.billing,0) = 1)`)
      .then(result => {
        if (result.rowsAffected > 0) {
            let ids = Object.keys(result.recordset).map(function(k){return result.recordset[k].ID_PK}).join(",");
            return pool
            .request()
            .query(`UPDATE MRCSHH SET INV_PRT_FL = 1 WHERE ID_PK in (${ids})`)
            .then( res => {
              if(res.rowsAffected > 0){
                console.log(`Update Complete - ${res.rowsAffected} invoices updated`);
                pool.close();
              }
            })
            .catch(err => {
              if (err){
                let mailOptions = {
                  from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                  to: 'itsupport@metrogroupinc.com', // list of receivers
                  subject: 'Invoice Print Flag Node App Error ', // Subject line
                  cc: '',
                  html: `<strong>Attention!!</strong> Print Invoice Update has failed to update the DB<br />Error:  ${err.message}` // html body
                };
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log(error);
                    fs.open('log.txt', 'a', 666, (err, id) => {
                      if (err) {
                        console.log(err);
                      }
                      fs.write(id, ` ${new Date()} - ERROR: ${err} \r\n`, null, 'utf8', () => {
                        fs.close(id, () => {

                        })
                      })
                    })
                  }
                });
              }
            })
          //Close connection to DB
          console.log(`Exit Program`);
          pool.close();
        } else {
          process.exit();
        }
      })
  })
  .catch(err => {
    console.log(err);
  });
