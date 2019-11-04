var moment = require('moment');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
    first_name: {type: String, max: 100},
    family_name: {type: String, required: true, max: 100},
    date_of_birth: {type: Date, required: true},
    date_of_death: {type: Date},
  }, {discriminatorKey: 'tete'});



// AuthorSchema.pre('save', function (next) {
//   if (this.isNew && this.first_name === 'toto') {
//     AuthorSchema.add({tete_a_toto : Number });                                                                                                                                   
//   }
//   next();
// });

// Virtual for author's full name
AuthorSchema
.virtual('name')
.get(function () {
  return this.family_name + ', ' + this.first_name;
});

// Virtual for author's lifespan
AuthorSchema
.virtual('lifespan')
.get(function () {
  var birthYear = this.date_of_birth ? moment(this.date_of_birth).get('year') : '';
  var deathYear = this.date_of_death ? moment(this.date_of_death).get('year') : '';
  return `${birthYear}-${deathYear}`;
});

// Virtual for author's URL
AuthorSchema
.virtual('url')
.get(function () {
  return '/catalog/author/' + this._id;
});

AuthorSchema
.virtual('birth_date_formatted')
.get(function () {
  return moment(this.date_of_birth).format('YYYY-MM-DD');
});

AuthorSchema
.virtual('death_date_formatted')
.get(function () {
  return moment(this.date_of_death).format('YYYY-MM-DD');
});



//Export model
const Author = mongoose.model('Author', AuthorSchema);
const Toto = Author.discriminator('Toto', new Schema({tete_a_toto : Number}))

module.exports = Author;