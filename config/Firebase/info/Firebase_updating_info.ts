/*
//Firestore - Top 12 calls

// 1.SetDoc (allows us to add data to DB with a custom ID - ID='customAF')

async createUserWithSetDoc() {
    const id = '123'; //custom ID
    const data = {
        name: "John Doe",
        email: "john@doe,
    }; // creating user object with just a name and an email
    const userDoc = doc(db, 'users', id); //This is a document object using the 'doc' function to pass (db, collectionName, custom Id) 

    await setDoc(userDoc, data); //call SetDoc and the data we want to put in it
    return {
        id,
        ...data,
    };
}

// 2.AddDoc (We use this when we cool with firebase creating a unique ID for us - ID = not custom)

async createUserWithAddDoc() {
    const data = {
        name: "John Doe",
        email: "john@doe,
    }; // creating user object with just a name and an email
    
    const userCollection = collection(db, 'users'); //grab a reference to the user's collection by providing the firebase DB and name of the collection

   const docRef = await AddDoc(userCollection, data); //grab the id from the output of AddDoc
    return {
        id: docRef.id, //get the id from the document reference that was created by AddDoc
        ...data,
    }; // return a user object
}

// 3.AddDoc with Arrays (Adding items with Arrays)

    const data = {
        nicknames: ['jimmy', 'Tom', 'Jimbo'],
    }; // creating an object with the Array
    const userCollection = collection(db, 'users'); //create a reference to the collection

   const docRef = await AddDoc(userCollection, data); //grab the id from the output of AddDoc
    return {
        id: docRef.id, //get the id from the document reference that was created by AddDoc
        ...data,
    }; // return a user object

// 4.AddDoc with Subcollections 

async createUserWithSubCollection() {
    const data = {
        address: {
            zipcode: '35002',
        },
    }; // create a nested object

const userCollection = collection(db, 'users'); //get a reference to the collection
   
const docRef = await AddDoc(userCollection, data); //grab the id from the output of AddDoc
    return {
        id: docRef.id, //get the id from the document reference that was created by AddDoc
        ...data,
    }; // return a user object
}

// 5.Update a Document in a Firestore Collection (We can update values and add new key value pairs)

async updateUser() {
    const userDoc = doc(db, 'users', '123'); //get the doc

    await updateDoc(userDoc, {
        name: 'New Jim',
    }); // update the doc (the name in this case) with our changes
}

// 6.Update a Document with Arrays

async updateUserWithArray() {
    const userDoc = doc(db, 'users', '123'); //get the doc

    await updateDoc(userDoc, {
        nicknames: arrayUnion ('GEEM'),
    }); // To add a new value to the existing array, we can use a FB method called 'arrayUnion'

     await updateDoc(userDoc, {
        nicknames: arrayRemoive ('Jim'),
    }); //inversely, we can call arrayRemove to remove an item from the array
}

// 7.UpdateDoc with Subcollections 

async updateUserWithSubCollection() {
    const userDoc = doc(db, 'users', '123'); //get the doc
    
    await updateDoc(userDoc, {
        address: {
            zipcode: '35002',
        },
    }); // pass in an object to update
    // OR
    // We can use dot notation
    await updateDoc(userDoc, {
        'address.zipcode': '350',
    });
}

// 8.DeleteDoc (Not advisable - deletes the record in firebase) 

async deleteUser() {
    const userDoc = doc(db, 'users', '123'); //grab the doc by id
    await deleteDoc(userDoc;) // Call delete doc

// *** Note that sometimes it would be better to:
    await updateDoc(userDoc, {
    deleted: true
    });
*/
