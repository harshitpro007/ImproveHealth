export function Search(searchKey, path) {
  searchKey = searchKey.replace(/\\/g, '');
  const keyword = searchKey.trim().split(' ').filter(Boolean);
  if (keyword.length > 1) {
    return {

      $search: {
        text: {
          query: keyword,
          path: path,

        }
      }
    }
  } else {
    return {

      $search: {

        regex: {
          path: path,
          query: `(.*)${keyword[0]}(.*)`,
          allowAnalyzedField: true,
        }
      }
    }
  }
}


export function dispSearch(searchKey, path) {
  searchKey = searchKey.replace(/\\/g, '').replace(/[!@#$%^&*()_+={}[\];:'"<>,.?/]/g, ' ');
  
  // Split the searchKey by 'disp-' and filter out empty parts
  const keyword = searchKey.trim().split('disp-').filter(Boolean);
  
  // Determine the search keyword
  let searchKeyword: any;
  (keyword.length > 1) ? searchKeyword = keyword[1] : searchKeyword = keyword[0];
  
  // If the searchKey is 'disp' or 'disp-', return a match for all documents (no filtering)
  if (searchKey == 'disp' || searchKey == 'disp-') {
    return {
      $match: {}  // Match all documents without filtering
    };
  } else {
    return {
      $search: {
        regex: {
          path: path,  
          query: `${searchKeyword}(.*)`,  
          allowAnalyzedField: true,
        }
      }
    };
  }
}




