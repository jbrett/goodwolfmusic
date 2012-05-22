<?php
   error_reporting(E_ALL|E_STRICT);
   ini_set('display_errors', true);
   date_default_timezone_set('America/Chicago');

   // Define base path obtainable throughout the whole application
    defined('BASE_PATH')
        || define('BASE_PATH', realpath(dirname(dirname(__FILE__))));


    // Define path to application directory
    defined('APPLICATION_PATH')
        || define('APPLICATION_PATH', BASE_PATH . '/application');

    // Define application environment
    defined('APPLICATION_ENV')
        || define('APPLICATION_ENV', (getenv('APPLICATION_ENV') ? getenv('APPLICATION_ENV') : 'development'));

   set_include_path(implode(PATH_SEPARATOR, array(
       realpath(APPLICATION_PATH . '/../library'),
       APPLICATION_PATH . '/modules/admin/models' ,
       get_include_path(),
   )));

   /** Zend_Application */
   require_once 'Zend/Application.php';

   // Create application, bootstrap, and run
   $application = new Zend_Application(
       APPLICATION_ENV,
       APPLICATION_PATH . '/configs/application.ini'
   );

   $application->bootstrap()->run();