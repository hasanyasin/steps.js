# steps.js

## Problem
Event based programming is as good as it gets when we want high performing
scalable systems. However, organization of code is simply awful. I wish there
was a platform where event loop is implemented at interpreter level so
interpreter would stop execution of a call stack and switch to the next one when
the call will be waiting for an outside job to be done. This way, we could have
been free from dividing our code into multiple functions which really kills the
readibility and simplicity of implementation of an idea.

Until we have such a platform, obviously we need to find ways to be happier with
what already exists. For node-js and maybe client-side (browser) JavaScript, I
have built this library for code organization.

Simply you first think of a process in steps. Then when you start coding, you
organize your code into these steps using this library.

## Approach
Here is an example use of the library.

	// We define our three main steps:
	var init 	= new step('Initialization'),
		main 	= new step('Main Process'),
		cleanup	= new step('Cleanup'),

	// Connect them one after another:
	main.wait(init)
	cleanup.wait(main)
	// This means "main" step will wait for "init" step to be done. It also
	// means "run main when init is done". The same for main and cleanup steps.


	// Add an asynchronous call:
	init.async(my_async_function, this_object)
	// my_async_function will be called during init step as the first thing.
	// Since it is added as an async call, system will wait for
	// my_async_function to call the callback which is provided as the only
	// parameter when calling it.

	// Add a synchronous call:
	init.sync(my_sync_function, this_object, ['first-parameter', 2, 3])

	// Let's start:
	init.check()
	// Since init has no steps to wait, it will immediately start and two
	// functions attached above will be called. Then main step, then cleanup
	// step.

As you understood from the example, this library is only useful when you have
multiple things to run in parallel and you have other things to run when all
these initial things are done.

	This library does not provide a lot in this case:
	Job1 --> Job2 --> Job3 --> Job4

	This is where it is really useful:
			 -- Job2a --
			/			\
	Job1 --= -- Job2b -- = --> Job3
			\			/
			 -- Job2c --

For example, during the processing of a web request in a web server, you need to
start reading the `POST` body as soon as the stream starts. However, your system
does not need to wait until all `POST` parameters are read, to be able to do
other things such as loading session and checking authorization for the request.

Another example is when you need to make multiple requests to external resources
and want to do something when all these requests are done. You don't need to
make these requests one after another or you don't need to count callbacks. What
this simple library does is exactly that.

## Internals
This module defines two types of objects: step and call.

A step has three lists: `pre`, `calls`, and `post`. `pre` and `post` are lists
of other step instances and calls list is a list of call objects, obviously.

`step` is a real JS object that is created by calling `new step(...)` while a
call is an ordinary array of which elements have meanings according to their
places.

	call = [return_type, function, this_object, [argument-list]]

When the time comes, function is called as

	function.apply(this_object, [argument-list]);

If there is one thing that is magical here, it is `return_type`. `return_type`
of a call object defines how we will know this call will be considered done.
Most of the calls will be for asynchronous functions so step will not be
considered done until these functions calls the callback function.

return_type can be dropped or have these values:

	false
	<number>
	[<number>, '<a string>']

If `return_type` is dropped, i.e first element in call array is a function, then
`return_type` is considered -1, which means the callback function will be added
to the end of the arguments list.

If `return_type` is false, it means this call is not async, i.e call is
considered done when function returns.

If `return_type` is a number, it is used as the index where callback function
will be put in arguments list. It can be either `-1`, `0`, or any positive
integer.

`-1` means the end of the arguments list. You might think "hey, why aren't other
negative numbers valid? Wouldn't it be awesome being able to put callback by
indexing backwards?" and I will say "No, it wouldn't."

If `return_type` is an array of two elements, a number and a string, then
callback is attached as an attribute to _number_th element of arguments list
with string as attribute name: `attributes[number][string] = callback`

Examples of how call objects and how they are used by this library:

	[0, myfunct, myself, [arg1, arg2]]
	--> myfunct.apply(myself, [callback, arg1, arg2])

	[1, myfunct, mysql, [arg1, arg2]]
	--> myfunct.apply(myself, [arg1, callback, arg2])

	[-1, myfunct, mysql, [arg1, arg2, ...]]
	--> myfunct.apply(myself, [arg1, arg2, ..., callback])

	[[2, 'on_success'], myfunct, myself, [arg1, arg2, arg3, arg4, ...]]
	-->
		arg3['on_success'] = callback;
		myfunct.apply(myself, arg1, arg2, arg3, arg4... );


## Error Handling
This library does not provide error handling for calls in steps. Each call
should take care of their own problems before calling the callback provided.
Callback functions do only one thing: marks this call as done and moves on.

This is not a lack of features; but a very good design to solve things at
correct places.

## Events vs Steps
Steps are not an alternative to events (node's EventEmitter, for example); but
maybe a companion. A step knows only one type of event: done. When you need to
have multiple async calls completed before making another set of calls,
organizing these calls into steps makes sense.

## TODO:

	define call structure for on('event') calls
		return_type: 'event-name'?
			['data', funct, streamObject]
			--> streamObject.on('data', funct)?
	timeouts for calls

