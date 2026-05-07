import logo from "../assets/img/pathpal-logo.svg";
import { FiChevronRight } from "react-icons/fi";
import { useContext, useEffect, useState } from "react";
import {
  MapDataContextType,
  NavigationContextType,
  ObjectItem,
} from "@/utils/types";
import { BookingContext, MapDataContext, NavigationContext } from "../pages/Map";

import { navigateToObject } from "@/utils/navigationHelper";
import { FaInfoCircle } from "react-icons/fa";
import BookingPanel from "./BookingPanel";
import BookingDialog from "./BookingDialog";
import type { Desk } from "@/utils/bookingApi";

interface ParsedObjects {
  [key: string]: {
    len: number;
    results: ObjectItem[];
  };
}

function Sidebar() {
  const { navigation, setNavigation, setIsEditMode, setCurrentFloor } = useContext(
    NavigationContext
  ) as NavigationContextType;
  const { objects } = useContext(MapDataContext) as MapDataContextType;
  const [parsedObjects, setParsedObjects] = useState<ParsedObjects>({});
  const [isRotating, setIsRotating] = useState(false);
  const [activeTab, setActiveTab] = useState<"places" | "desks">("places");

  // Desk booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);

  useEffect(() => {
    const groupedObjects = () => {
      const data: ParsedObjects = {};
      objects.forEach((object) => {
        const firstLetter = object.name.charAt(0).toUpperCase();
        if (!data[firstLetter]) {
          data[firstLetter] = {
            len: 0,
            results: [],
          };
        }
        data[firstLetter].results.push(object);
        data[firstLetter].len += 1;
      });
      setParsedObjects(data);
    };
    groupedObjects();
  }, [objects]);

  function handleObjectNavigation(selectedObjectName: string) {
    const object = objects.find((obj) => obj.name === selectedObjectName);
    setIsEditMode(false);
    if (!object) return;
    console.log(object);
    navigateToObject(object.name, navigation, setNavigation, setCurrentFloor);
  }

  function handleDeskClick(desk: Desk) {
    setSelectedDesk(desk);
    setBookingDialogOpen(true);
  }

  return (
    <aside className="flex flex-col rounded-none w-[35rem] h-screen p-3 bg-white shadow-xl shadow-gray-200 -translate-x-full transform transition-transform duration-150 ease-in lg:translate-x-0 lg:shadow-md ">
      <header className="flex flex-col mb-4 pr-1 border-b py-2 w-full">
        <a
          href="https://github.com/openindoormap/openindoormaps"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-800 text-xs"
        >
          <div className="flex items-center p-2 mb-4 text-blue-800 border border-blue-300 rounded-lg bg-blue-50">
            <FaInfoCircle className="w-4 h-4 mr-2" />
            Check out my new project OpenIndoorMaps
          </div>
        </a>
        <div className="flex items-center flex-none mr-10">
          <div className="rounded-md w-16 h-16 p-4 bg-gray-100 center">
            <img
              src={logo}
              alt="PathPal"
              className={` ${isRotating ? "rotate" : ""}`}
              onClick={() => setIsRotating(true)}
              onAnimationEnd={() => setIsRotating(false)}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900 pl-2">
                PathPal
              </p>
              <p className="text-sm font-semibold text-[#225EA9] pl-2">
                Indoor-Navigation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex mb-3 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setActiveTab("places")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "places"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏬 Places
        </button>
        <button
          onClick={() => setActiveTab("desks")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "desks"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🪑 Desks
        </button>
      </div>

      {/* Places tab (original content) */}
      {activeTab === "places" && (
        <div className="overflow-auto h-full">
          {Object.keys(parsedObjects)
            .sort()
            .map((letter, index) => (
              <div key={index} className="mb-4">
                <header className="p-2">
                  <h2 className="text-2xl font-bold">
                    {letter}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      - {parsedObjects[letter].len}{" "}
                      {parsedObjects[letter].len === 1 ? "Result" : "Results"}
                    </span>
                  </h2>
                </header>
                <div className="flex flex-col ">
                  {parsedObjects[letter].results.map((item) => (
                    <div
                      key={item.id?.toString()}
                      data-product={item.name}
                      className="flex bg-[#f4faff] m-1 px-4 py-2 shadow-sm rounded-md cursor-pointer h-auto hover:bg-[#e4f2ff]"
                      onClick={() => handleObjectNavigation(item.name)}
                    >
                      <div className="m-1">
                        <p className="text-xs 2xl:text-sm font-semibold">
                          {item.name}
                          {item.floor && (
                            <span className="text-gray-400 ml-1 font-normal">
                              (F{item.floor})
                            </span>
                          )}
                        </p>
                        <p className="text-xs 2xl:text-sm  text-gray-600">
                          {item.desc}
                        </p>
                      </div>
                      <div className="center ml-auto h-auto center text-xl text-blue-300">
                        <FiChevronRight />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Desks tab (new booking panel) */}
      {activeTab === "desks" && (
        <div className="flex-1 overflow-hidden">
          <BookingPanel onDeskClick={handleDeskClick} />
        </div>
      )}

      {/* Booking dialog (shared between sidebar desk clicks) */}
      <BookingDialog
        open={bookingDialogOpen}
        desk={selectedDesk}
        onClose={() => setBookingDialogOpen(false)}
      />
    </aside>
  );
}
export default Sidebar;
