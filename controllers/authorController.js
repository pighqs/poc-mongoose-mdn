const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const Author = require('../models/author');
const Book = require('../models/book');

// Display list of all Authors.
exports.author_list = (req, res) => {
    Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('author_list', { title: 'Author List', author_list: list_authors });
    });
};

// Display detail page for a specific Author.
exports.author_detail = (req, res) => {
    async.parallel({
        author: (callback) => {
            Author.findById(req.params.id)
              .exec(callback)
        },
        authors_books: (callback) => {
          Book.find({ 'author': req.params.id },'title summary')
          .exec(callback)
        },
    }, (err, results) => {
        if (err) { return next(err); } // Error in API usage.
        if (results.author==null) { // No results.
            const err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books } );
    });};

// Display Author create form on GET.
exports.author_create_get = (req, res) => {
    res.render('author_form', { title: 'Create Author'});
};

// Handle Author create on POST.
exports.author_create_post = [

    // Validate fields.
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('author_form', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid.
            // Create an Author object with escaped and trimmed data.
           let author = {
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            date_of_death: req.body.date_of_death,
            tete: 'Toto',
            tete_a_toto: 10,
        };

            Author.create(author, (err, author) => {
                if (err) { return next(err); }
                // Successful - redirect to new author record.
                console.log('author: ', author);
                    res.redirect(author.url);
                });


            // author.save((err, savedAuthor) => {
            //     console.log('savedAuthor: ', savedAuthor);
            //     if (err) { return next(err); }
            //     // Successful - redirect to new author record.
            //     res.redirect(author.url);
            // });
            
        }
    }
];

// Display Author delete form on GET.
exports.author_delete_get = (req, res) => {
    async.parallel({
        author: (callback) => {
            Author.findById(req.params.id).exec(callback)
        },
        author_books: (callback) => {
          Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, (err, results) => {
        if (err) { return next(err); }
        if (results.author==null) { // No results.
            res.redirect('/catalog/authors');
        }
        // Successful, so render.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.author_books } );
    });
};

// Handle Author delete on POST.
exports.author_delete_post = (req, res) => {
 async.parallel({
        author: (callback) => {
          Author.findById(req.body.authorid).exec(callback)
        },
        author_books: (callback) => {
          Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, (err, results) => {
        if (err) { return next(err); }
        // Success
        if (results.author_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.author_books } );
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });
};

// Display Author update form on GET.
exports.author_update_get = (req, res) => {
    Author.findById(req.params.id).exec((err, author) => {
        if (err) { return next(err); }
        if (author == null) { // No results.
            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        res.render('author_form', { title: 'Update Author', author: author });
      });
};

// Handle Author update on POST.
exports.author_update_post = [
    // Validate fields.
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

     //process request
     (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validationResult(req);
        // create a BookInstance object with escaped/trimmed data and old id.
        const author = new Author(
            {
                first_name: req.body.first_name,
                family_name: req.body.family_name,
                date_of_birth: req.body.date_of_birth,
                date_of_death: req.body.date_of_death,
                _id:req.params.id //This is required, or a new ID will be assigned!
            });

        if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values and error messages.
            Author.findById(req.params.id)
                .exec((err, author) => {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('author_form', { title: 'Update Author', author : author, errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            Author.findByIdAndUpdate(req.params.id, author, {}, (err,author) => {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
                   res.redirect(author.url);
                });
        }

    }

];