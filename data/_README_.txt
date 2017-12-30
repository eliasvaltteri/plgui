# 
# here are the instructions to load these files into your mongodb database
# requirement are to have mongodb installed, correctly set to path and running
# and a unix bash
# 
# warning!! if you already have a database called 'softarc', it will we dropped!
#   
# execute the following pipeline in your bash/cmd
# 
mongo softarc --eval "db.dropDatabase()" | 
mongoimport -d softarc -c routes --type csv --file routes.csv --headerline | 
mongoimport -d softarc -c stops --type csv --file stops.csv --headerline | 
mongoimport -d softarc -c mapping --type csv --file mapping.csv --headerline |
mongoimport -d softarc -c restaurants --type csv --file restaurants.csv --headerline