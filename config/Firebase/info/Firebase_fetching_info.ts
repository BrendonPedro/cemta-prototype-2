// // 1.GetDoc

// async getUser() {
// const userDoc = doc(db, 'users', '123'); //grab the document referred to by the key "123'
// const user =await getDoc(userDoc);
// return user.data(); // calling .data to retrieve the value
// }

// // 2.Query

// async getUser() {
// const userDoc = doc(db, 'users'); // get a reference to the user collection
// const q = query(userCollection); // Use the 'query' method to define the query
// const records = await getDocs(q); // pass that value to the 'GetDocs' function
// return records.docs; // calling .dos on the response to view the documents
// }

// // 3.Query with filtering (pass in a 'where' clause in the query)

// async getUser() {
// const userDoc = doc(db, 'users'); // get a reference to the user collection
// const q = query(userCollection, where('name', '==', 'jim')); //passing in the 'where' clause to filter
// const records = await getDocs(q); // pass that value to the 'GetDocs' function
// return records.docs; // calling .dos on the response to view the documents
// }

// // 4.Query with Pagination (pass in 'orderBy' and 'limit' functions in the query)

// async getUser() {
// const userDoc = doc(db, 'users'); // get a reference to the user collection
// const q = query(userCollection, orderBy('name'), limit(3)); //ordering the docs and only returning a certain amount of them
// const records = await getDocs(q); // pass that value to the 'getDocs' function
// return records.docs; // calling .dos on the response to view the documents
// }
// */
