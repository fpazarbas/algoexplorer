import { useLayout } from "@/lib/hooks/use-layout";
import Textarea from "../ui/forms/textarea";
import Input from "../ui/forms/input";
import React, { useEffect, useState } from "react";
import { Console } from "console";
import { peraWallet } from "@/data/dynamic/peraConnect";
import ToggleBar from "../ui/toggle-bar";
import { Unlocked } from "../icons/unlocked";
import Button from "../ui/button/button";
import { asaList, getAsaList} from "@/data/static/coin-list";
import { string } from "yup";
import { createAsset } from "@/data/dynamic/launchPadDynamic";


export default function Farms() {
    let [decimal,setDecimal] = useState(0);
    let [total , setTotal] = useState(1);
    let [wallet , setWallet] = useState("");
    let [manager , setManager] = useState("");
    let [freeze , setFreeze] = useState("");
    let [crawback , setCrawback] = useState("");
    let [reserve , setReserve] = useState("");
    let [isFrozen , setFrozen] = useState(false);
    let [buttonLabel,setButtonLabel] = useState("You Need To Have 1 $KC");
    let [unitName,setUnitName] = useState("");
    let [assetName,setAssetName] = useState("");
    let [assetUrl,setAssetUrl] = useState("");
    let [tinyError,setTinyError] = useState("");
    let [successMessage,setSuccess] = useState("");
    let [isLoading , setisLoading] = useState(false);
    
    useEffect(() => {
             setWallet(peraWallet.connector ? peraWallet.connector.accounts[0] : "");
       }, []);
   
    const { layout } = useLayout();
    const handleDecimalChange =  (data:any) => {
       const min = data.currentTarget.min;
       const max = data.currentTarget.max;
       let val = data.currentTarget.value;
       const value = Math.max(Number(min), Math.min(Number(max), Number(val)));
       setDecimal(value);
    }

    const handleTotalChange =  (data:any) => {
        const min = data.currentTarget.min;
        const max = data.currentTarget.max;
        let val = data.currentTarget.value;
        const value = Math.max(Number(min), Math.min(Number(max), Number(val)));
        setTotal(value);
     }

    
     const createAsa = async () =>  {
        setisLoading(true);
        if (wallet != "") {
           const response =  await createAsset(total,decimal,wallet,manager,reserve,freeze,crawback,assetUrl,isFrozen,unitName,assetName);
            const succeed = response[0];
           if (succeed != null) {
             setSuccess(`Asset ID created: ${succeed}`);
            const assetUrl = "https://algoexplorer.io/asset/" + succeed
            window.open(assetUrl, '_blank');
           }else{
            const error = response[1];
            if (error) {
                setTinyError(error.message )
                window.open("https://kocalgo.io/swap/", '_blank');
            }
           }
           setisLoading(false);
        }else{
            setisLoading(false);
            setTinyError("Please Connect your Wallet")
        }
      
     }

     const handleValChange = async (data:any) => {
       console.log(data.target.id)
       const id = data.target.id;
       switch (id) {
        case "assurl":
            setAssetUrl(data.target.value);
        break;
        case "asaname":
            setAssetName(data.target.value);
        break;
        case "unitname":
            setUnitName(data.target.value);
        break;               
        case "manager":
            setManager(data.target.value);
        break;
        case "crawback":
            setCrawback(data.target.value);
        break;
        case "freeze":
            setFreeze(data.target.value);
        break;
        case "reserve":
            setReserve(data.target.value);
        break;
        default:
            break;
       }
     }
    
    return (
        <>
       
        <div className="mb-6 rounded-lg bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-large dark:bg-light-dark xs:p-6 xs:pb-8">
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Asa Name
        </h4>
        <Input id="asaname" onChange={(data) => handleValChange(data)} placeholder="KOC" />
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Unit Name
        </h4>
        <Input id="unitname" onChange={(data) => handleValChange(data)} placeholder="KC" />
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Total
        </h4>
        <Input type="number" 
        placeholder="total"
         value={total} 
        onChange={(data)=> handleTotalChange(data)} 
        min={1}
         max={100000000000000000000}/>

        <ToggleBar 
         title="Frozen"
         subTitle=""
         icon={<Unlocked />}
         checked={isFrozen}
         onChange={() => setFrozen(!isFrozen)}
        
        />
          <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Decimals
        </h4>
        <Input value={decimal} type="number" onChange={(data) => handleDecimalChange(data)} min={0} max={19}/>

        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Creator Account
        </h4>
        <Input id="wallet" value={wallet}  placeholder="Please Connect Your Wallet or Enter Wallet Adress"/>
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Manager Account
        </h4>
        <Input id="manager"  onChange={(data) => handleValChange(data)} placeholder="Please Connect Your Wallet or Enter Wallet Adress"/>
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Reserve Account
        </h4>
        <Input id="reserve" onChange={(data) => handleValChange(data)} placeholder="Please Connect Your Wallet or Enter Wallet Adress"/>
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Clawback Account
        </h4>
        <Input id="crawback" onChange={(data) => handleValChange(data)}  placeholder="Please Connect Your Wallet or Enter Wallet Adress"/>
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Freeze Account
        </h4>
        <Input id="freeze" onChange={(data) => handleValChange(data)} placeholder="Please Connect Your Wallet or Enter Wallet Adress"/>
        <h4 className="mb-2 text-base font-medium dark:text-gray-100 xl:text-lg">
            Asset Url
        </h4>
        <Input id="assurl" placeholder="Asset Url (Optional)" onChange={(data) => handleValChange(data)}/>
        
        <p className='font-medium gap-3' style={{color:'red'}}> {tinyError}</p>
        <p className='font-medium gap-3' style={{color:'green'}}> {successMessage}</p>

        <Button
          size="large"
          shape="rounded"
          style={{backgroundColor:'#EA3C12'}}
          fullWidth={false}
          isLoading={isLoading}
          onClick={createAsa}
          className="mt-6 uppercase xs:mt-8 xs:tracking-widest">
          Create Asa
          
        </Button>
        </div>
        </>
        
    );
  }