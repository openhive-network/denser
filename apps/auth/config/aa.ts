// Importing my config files
// import { Config } from '../app-config'
import DefaultConfig from './default.json'
import YogiConfig from './yogi.json'

// Creating a union of my config
type Config = typeof DefaultConfig | typeof YogiConfig;
