const commander = require('commander');
const { prompt, AutoComplete, MultiSelect } = require('enquirer');
const mongoose = require('mongoose');
const fs = require('fs');

// Connect to your MongoDB database
const localdbadd = "mongodb://localhost:27017/mydatabase"
mongoose.connect(localdbadd, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});


const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    desc: { type: String },
    category: { type: Array },
    data: { type: Buffer },
    timestamp: { type: Date, default: Date.now },
    stats: { type: Object, default: {} },
    synced: { type: Boolean, default: false }
});

const File = mongoose.model('File', fileSchema);

const savefilefunc = async () => {
    const questions = [
        {
            type: 'input',
            name: 'filename',
            message: 'Enter the filename'
        },
        {
            type: 'input',
            name: 'desc',
            message: 'Describe your file'
        },
        {
            type: 'input',
            name: 'category',
            message: 'Enter the category'
        },
    ];
    try {
        const answers = await prompt(questions);
        let fileData;
        try {
            fileData = fs.readFileSync(answers.filename);
        } catch (err) {
            console.log("File didn't found")
            return;
        }
        cat = answers.category.split(/(\s+)/).filter(function (e) { return e.trim().length > 0; });
        // Create a new instance of the File model
        const file = new File({
            filename: answers.filename,
            desc: answers.desc,
            category: cat,
            data: fileData,
            stats: fs.statSync("."),
            synced: false
        });

        let returnval = await file.save();
        if (returnval) {
            console.log('File saved successfully.');
            console.log(returnval._id.toString())
        } else {
            console.log("File didn't saved")
        }
        mongoose.connection.close();
    } catch (error) {
        console.error('Error saving file:', error);
        mongoose.connection.close();
    }
}

const listallfiles = async () => {
    try {
        const filesdata = await File.find();
        if (!filesdata) {
            console.log('File not found in the database.');
            return;
        }
        if (filesdata) {
            for (const file of filesdata) {
                console.log("ID : ", file._id.toString())
                console.log("Filename : ", file.filename)
                console.log("Desc : ", file.desc)
                console.log("Category : ", file.category)
                console.log("Time : ", file.timestamp.toString())
                console.log("-------------------------------------------")
            }
        }
        console.log(filesdata.length)
    } catch (error) {
        console.error('Error saving file:', error);
    }
}

const delfile = async (uid) => {
    let allfiles = await File.find()
    let arr = []
    for (const i of allfiles) {
        arr.push(i.filename)
    }
    arr.push("cancel")
    const prompt = new AutoComplete({
        name: 'file',
        message: 'Select a file',
        limit: 10,
        initial: 0,
        choices: arr
    });

    let answer = await prompt.run()
    try {
        if (answer === "cancel") return;
        const filetodelete = await File.findOneAndDelete({ filename: answer })
        if (filetodelete) {
            console.log("File deleted successfully")
        } else {
            console.log("File not deleted")
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

const savefiletocurrentdir = async () => {
    let allfiles = await File.find()
    let arr = []
    for (const i of allfiles) {
        arr.push(i.filename)
    }
    arr.push("cancel")
    const prompt = new AutoComplete({
        name: 'file',
        message: 'Select a file',
        limit: 10,
        initial: 0,
        choices: arr
    });

    let answer = await prompt.run()
    if (answer === "cancel") return;
    try {
        const fileData = await File.findOne({ filename: answer });
        if (!fileData) {
            console.log('File not found in the database.');
            return;
        }
        // Save the file data to the current folder
        fs.writeFileSync(fileData.filename, fileData.data);
        console.log(`File "${fileData.filename}" saved in the current folder.`);
    } catch (error) {
        console.error('Error saving file:', error);
    }
}

const searchfile = async () => {
    const question = {
        type: 'input',
        name: 'filename',
        message: 'Search'
    };

    let ans = await prompt(question)
    let filename = ans.filename
    filename = filename.toLowerCase()
    let resarr = []
    try {
        let data = await File.find()
        for (const i of data) {
            let desc = i.desc.split(/(\s+)/).filter(function (e) { return e.trim().length > 0; })
            desc = desc.map(currdesc => currdesc.toLocaleLowerCase())
            if (i.filename.toLocaleLowerCase() === filename) {
                resarr.push(i)
            }
            if (i.filename.startsWith(filename)) {
                resarr.push(i)
            }
            if (i.category.includes(filename)) {
                resarr.push(i)
            }
            let myqueryarr = filename.split(/(\s+)/).filter(function (e) { return e.trim().length > 0; })
            for (let j = 0; j < myqueryarr.length; j++) {
                for (const currelem of desc) {
                    if (myqueryarr[j] === currelem) {
                        resarr.push(i)
                    }
                    if (currelem.startsWith(myqueryarr[j])) {
                        resarr.push(i)
                    }
                }
            }
        }
        let result = [...new Set(resarr)]
        for (const i of result) {
            console.log(i.filename)
        }
    } catch (err) {
        console.log(err)
    }
}

const exporttocloud = async () => {
    const question = [
        {
            type: "input",
            name: "username",
            message: "Username"
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password'
        }
    ];
    let inputans = await prompt(question)
    let data = await File.find({ synced: false })
    let res = await mongoose.connection.close()
    if (res) {
        let newconn = await mongoose.connect(`mongodb+srv://${inputans.username}:${inputans.password}@cluster0.xsd2e.mongodb.net/`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        for (const ndata of data) {
            let newfiledata = new File(ndata);
            let res = await newfiledata.save()
            console.log(res)
        }
        mongoose.connection.close()
    }
}

const importdata = async () => {
    const question = [
        {
            type: "input",
            name: "username",
            message: "Username"
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password'
        }
    ];
    let inputans = await prompt(question)
    let res = await mongoose.connection.close()
    if (res) {
        let newconn = await mongoose.connect(`mongodb+srv://${inputans.username}:${inputans.password}@cluster0.xsd2e.mongodb.net/`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        let importedfiledata = await File.find()
        console.log(importedfiledata)
        mongoose.connection.close()
    }
}

const program = new commander.Command();

program
    .version('1.0.0')
    .description('Command line tool to save files in a database');

program
    .command('add')
    .description('Save a file to the database')
    .action(savefilefunc);

program
    .command('save')
    .description('Save a file in the current folder')
    .action(savefiletocurrentdir);

program
    .command('export')
    .description('Export all the data from database to the cloud')
    .action(exporttocloud);

program
    .command('import')
    .description('Import all the data from database to the cloud')
    .action(importdata);

program
    .command('del')
    .description('Delete a file in the database')
    .action(delfile);


program
    .command('list')
    .description('List all the files from the database')
    .action(listallfiles);

program
    .command('search')
    .description('Search any files from the database')
    .action(searchfile);


program.parse(process.argv);
