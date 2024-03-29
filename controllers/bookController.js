const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const async = require('async');

const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');


exports.index = (req, res) => {   
    
    async.parallel({
        book_count: (callback) => {
            Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        book_instance_count: (callback) => {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: (callback) => {
            BookInstance.countDocuments({status:'Available'}, callback);
        },
        author_count: (callback) => {
            Author.countDocuments({}, callback);
        },
        genre_count: (callback) => {
            Genre.countDocuments({}, callback);
        }
    }, (err, results) => {
        res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
};

// Display list of all books.
exports.book_list = (req, res) => {
    Book.find({}, 'title author')
    // populate will replace the author id by the full author details
    .populate('author')
    .exec((err, list_books) => {
    console.log('list_books: ', list_books);
    Book.aggregate([
        { $group: {
            author : {
                family_name: 'Bova'}
        }},
        
    ], function (err, result) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(result);
    });
      if (err) { return next(err); }
      //Successful, so render
    //   res.render('book_list', { title: 'Book List', book_list: list_books });
    });
};

// Display detail page for a specific book.
exports.book_detail = (req, res) => {
    async.parallel({
        book: (callback) => {
            Book.findById(req.params.id)
              .populate('author')
              .populate('genre')
              .exec(callback);
        },
        book_instance: (callback) => {
          BookInstance.find({ 'book': req.params.id })
          .exec(callback);
        },
    }, (err, results) => {

        if (err) { return next(err); }
        if (results.book==null) { // No results.
            const err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        res.render('book_detail', { title: 'Title', book: results.book, book_instances: results.book_instance } );
    });};

// Display book create form on GET.
exports.book_create_get = (req, res) => {
    // Get all authors and genres, which we can use for adding to our book.
    async.parallel({
        authors: (callback) => {
            Author.find(callback);
        },
        genres: (callback) => {
            Genre.find(callback);
        },
    }, (err, results) => {
        if (err) { return next(err); }
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array.
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },
    // Validate fields.
    body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
    body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),
  
    // Sanitize fields (using wildcard).
    sanitizeBody('*').trim().escape(),

       // Process request after validation and sanitization.
       (req, res, next) => {
        
        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data.
        const book = new Book(
          { title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.
            // Get all authors and genres for form.
            async.parallel({
                authors: (callback) => {
                    Author.find(callback);
                },
                genres: (callback) => {
                    Genre.find(callback);
                },

            }, (err, results) => {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', { title: 'Create Book',authors:results.authors, genres:results.genres, book: book, errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Save book.
            book.save((err) => {
                if (err) { return next(err); }
                   //successful - redirect to new book record.
                   res.redirect(book.url);
                });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = (req, res) => {
    async.parallel({
        book: (callback) => {
            Book.findById(req.params.id).exec(callback)
        },
        book_instances: (callback) => {
            BookInstance.find({ 'book': req.params.id })
            .exec(callback);
        },
    }, (err, results) => {
        if (err) { return next(err); }
        if (results.book==null) { // No results.
            res.redirect('/catalog/books');
        }
        // Successful, so render.
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances } );
    });
};

// Handle book delete on POST.
exports.book_delete_post = (req, res) => {
    async.parallel({
        book: (callback) => {
          Book.findById(req.body.bookid).exec(callback)
        },
        book_instances: (callback) => {
            BookInstance.find({ 'book': req.body.bookid }).exec(callback)
        },
    }, (err, results) => {
        if (err) { return next(err); }
        // Success
        if (results.book_instances.length > 0) {
            // Book has instances. Render in same way as for GET route.
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances } );
            return;
        }
        else {
            // Book has no books instances. Delete object and redirect to the list of authors.
            Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/books')
            })
        }
    });
};

// Display book update form on GET.
exports.book_update_get = (req, res) => {
    // Get book, authors and genres for form.
    async.parallel({
        book: (callback) => {
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        authors: (callback) => {
            Author.find(callback);
        },
        genres: (callback) => {
            Genre.find(callback);
        },
        }, (err, results) => {
            if (err) { return next(err); }
            if (results.book==null) { // No results.
                const err = new Error('Book not found');
                err.status = 404;
                return next(err);
            }
            // Success.
            // Mark our selected genres as checked.
            for (let all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
                for (let book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                    if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
                        results.genres[all_g_iter].checked='true';
                    }
                }
            }
            res.render('book_form', { title: 'Update Book', authors:results.authors, genres:results.genres, book: results.book });
        });
};

// Handle book update on POST.
exports.book_update_post = [

    // Convert the genre to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },
   
    // Validate fields.
    body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
    body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

    // Sanitize fields.
    sanitizeBody('title').trim().escape(),
    sanitizeBody('author').trim().escape(),
    sanitizeBody('summary').trim().escape(),
    sanitizeBody('isbn').trim().escape(),
    sanitizeBody('genre.*').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        const book = new Book(
          { title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: (callback) => {
                    Author.find(callback);
                },
                genres: (callback) => {
                    Genre.find(callback);
                },
            }, (err, results) => {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', { title: 'Update Book',authors:results.authors, genres:results.genres, book: book, errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id, book, {}, (err,thebook) => {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
                   res.redirect(thebook.url);
                });
        }
    }
];