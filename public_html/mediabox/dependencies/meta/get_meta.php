<?php
/**
 * Created by 23rd and Walnut
 * www.23andwalnut.com
 * User: Saleem El-Amin
 * Date: 3/12/11
 * Time: 12:11 AM
 */

//Make sure the current php installation has json_encode
if (!function_exists('json_encode')){
    echo '{"status":"error", "error_msg":"This utility requires json_encode. Please upgrade your version of php"}';
    exit;
}
           
//Make sure there is actually media to process
if (!isset($_POST['media'])){
    echo '{"status":"error", "error_msg":"No media to process"}';
    exit;
}

//Include the Id3 library
 require_once('getid3/getid3/getid3.php');

//Path to the location of the root
//$relative_path_to_media_folder = "../../../../../"; //TODO: IMPORTANT!! THis isn't going to work.
$relative_path_to_media_folder = realpath(dirname(dirname(dirname(dirname(__FILE__))))); //TODO: IMPORTANT!! THis isn't going to work.

//Get the media files;
$media_files = $_POST['media'];

//create an instance of the id3 library
$getID3 = new getID3;

//analyze the files and return the result json
echo json_encode(get_meta($media_files));


function get_meta($files)
{
    global $getID3;

    $media = array();

    if (!is_array($files)) {
        $files[0] = $files;
    }
    
    foreach ($files as $file)
    {
        //Check to see if the file exists, if not append path to root, which will hopefully work
        if (!file_exists($file)) {
            global $relative_path_to_media_folder;
            $file = $relative_path_to_media_folder . trim($file, '\\');
        }
        //if the file exists, process it. If not, set error
        if (file_exists($file)) {
            $getID3->option_tag_id3v2 = true;

            //analyze the file
            $ThisFileInfo = $getID3->analyze($file);

            $getID3->option_tags_images = true;

            getid3_lib::CopyTagsToComments($ThisFileInfo);

            //Check for error, set variables if there are none
            if (!isset($ThisFileInfo['error'][0])) {

                //determine if there is cover art associated with this file
                if (isset($getID3->info['id3v2']['APIC'][0]['data']) || isset($getID3->info['id3v2']['PIC'][0]['data'])) {
                    $cover = 1;
                }
                else
                {
                    $cover = 0;
                }

                //set all variables, ignoring errors
                $this_media = array(
                    'artist' => @$ThisFileInfo['comments_html']['artist'][0],
                    'name' => @$ThisFileInfo['comments_html']['title'][0],
                    'album' => @$ThisFileInfo['comments_html']['album'][0],
                    'play_length' => @$ThisFileInfo['playtime_string'],
                    'path' => @$ThisFileInfo['filename'],
                    'meta_cover' => $cover,
                    'meta_file_type' => end(explode('.', $file)),
                    'meta_file_path' => $file, //since we may have appended the relative path
                    'meta_attempted' => true,
                    'status' => 'success'
                );
            }
            else
            {
                $this_media = array(
                    'status' => 'error',
                    'meta_attempted' => true,
                    'error_msg'=> $ThisFileInfo['error'][0]
                );
            }


        }
        else
        {
            $this_media = array(
                'status' => 'error',
                'meta_attempted' => true,
                'error_msg' => "Unable to locate file"
            );
        }

        $media[] = $this_media;
    }
    $response = array(
        'status' => 'success',
        'media' => $media
    );

    return $response;
}


function pre($data)
{
    echo "<pre>";
    print_r($data);
    echo "</pre>";
}

?>