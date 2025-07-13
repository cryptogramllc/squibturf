exports.formatArrayToString = array => {
    const length = array.length;

    if (length === 0) {
        return '';
    } else if (length === 1) {
        return array[0];
    } else if (length === 2) {
        return `${array[0]} and ${array[1]}`;
    } else {
        const lastItem = array[length - 1];
        const otherItems = array.slice(0, -1).join(', ');
        return `${otherItems}, and ${lastItem}`;
    }
}


exports.dateStamp = () => {
    return new Date().getTime();
}

exports.formattedDate = async (timestamp) => {
    const date = new Date(parseInt(timestamp));
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} • ${day < 10 ? ' ' : ''}${day} • ${year}`;
}

exports.formatDateToYYYYMMDD = (timestamp) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const formattedDate = `${year}/${month}/${day}`;

    return formattedDate;
}


exports.extractTitleAndFormatText = (inputText) => {


    // Extract the title (text after "Title: ")
    const titleMatch = inputText.match(/Title:\s*(.*)/);
    const title = titleMatch ? titleMatch[1] : ''; // Extracted title

    // Remove the "Title:" part from the input text
    let content = inputText.replace(/Title:\s*(.*)/, '');

    // Remove "Introduction:" and "Conclusion:"
    content.replace(/Introduction:/g, '');
    content.replace(/Conclusion:/g, '');

    // Wrap sentences before a colon in <h4> tags
    content = content.replace(/(.*?):/g, '<h4>$1:</h4>');

    // Replace newlines with <br /> tags
    content = content.replace(/\n/g, '<br />');

    // Remove extra spaces and make it one line
    content = content.replace(/\s+/g, ' ');

    // Wrap in <article> tag
    const formattedText = `<article>${content}</article>`;

    return {
        title: title,
        content: formattedText,
    };
}





